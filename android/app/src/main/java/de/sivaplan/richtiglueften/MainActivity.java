package de.sivaplan.richtiglueften;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Native Hülle für die Web-App "Richtig Lüften".
 *
 * - Die Web-App liegt unter app/src/main/assets und wird über einen
 *   sicheren https-Origin (appassets.androidplatform.net) geladen, damit
 *   ES-Module und localStorage funktionieren.
 * - Der Abruf der AWEKAS-Wetterstation erfolgt nativ (kein CORS, kein Server).
 *   Die Web-App ruft dafür window.NativeWetter.abrufen(stationId) auf und
 *   bekommt das Ergebnis asynchron über window.__wetterResolve(json) zurück.
 */
public class MainActivity extends Activity {

    // Basis-Origin des AssetLoaders.
    private static final String BASE = "https://appassets.androidplatform.net";

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Lädt Dateien aus dem assets-Ordner unter dem Pfad "/".
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(true);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true); // für localStorage (Einstellungen)

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        // Brücke zwischen JavaScript und nativem Code.
        webView.addJavascriptInterface(new WetterBridge(), "NativeWetter");

        setContentView(webView);
        webView.loadUrl(BASE + "/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /** Wird aus JavaScript aufgerufen. */
    private class WetterBridge {
        @JavascriptInterface
        public void abrufen(final String stationId) {
            // Netzwerkaufruf in einem Hintergrund-Thread, Ergebnis zurück an JS.
            new Thread(() -> {
                final String json = ladeWetter(stationId);
                webView.post(() -> {
                    String js = "window.__wetterResolve && window.__wetterResolve("
                            + JSONObject.quote(json) + ");";
                    webView.evaluateJavascript(js, null);
                });
            }).start();
        }
    }

    /**
     * Ruft die AWEKAS-Station ab und liefert vereinfachtes JSON als String.
     * Bei Fehlern: {"error":"..."}.
     */
    private String ladeWetter(String stationId) {
        String id = (stationId == null || stationId.isEmpty()) ? "10833" : stationId;
        String urlStr = "https://app.awekas.at/v4/api/ajax_data.php?id=" + id + "&lng=de";
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android) RichtigLueften/1.0");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            int code = conn.getResponseCode();
            if (code != 200) {
                return "{\"error\":\"AWEKAS antwortet mit Status " + code + "\"}";
            }

            BufferedReader br = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
            br.close();

            JSONObject root = new JSONObject(sb.toString());
            JSONObject d = root.getJSONObject("data");
            JSONObject out = new JSONObject();
            out.put("temperature", d.getJSONObject("temp").getDouble("now"));
            out.put("humidity", d.getJSONObject("hum").getDouble("now"));
            if (d.has("dew") && !d.isNull("dew")) {
                out.put("dewpoint", d.getJSONObject("dew").optDouble("now"));
            }
            if (d.has("data_time")) {
                out.put("time", d.getLong("data_time"));
            }
            return out.toString();

        } catch (Exception e) {
            String msg = e.getMessage() == null ? "Abruf fehlgeschlagen" : e.getMessage();
            return "{\"error\":" + JSONObject.quote(msg) + "}";
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
