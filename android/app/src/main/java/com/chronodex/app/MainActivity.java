package com.chronodex.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static WebView webView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Get reference to WebView after initialization
        webView = getBridge().getWebView();
    }

    @Override
    protected void onDestroy() {
        webView = null;
        super.onDestroy();
    }
}
