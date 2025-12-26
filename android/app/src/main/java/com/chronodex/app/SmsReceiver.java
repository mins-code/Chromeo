package com.chronodex.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.webkit.WebView;

public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null) return;

        for (Object pdu : pdus) {
            SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
            String sender = smsMessage.getDisplayOriginatingAddress();
            String body = smsMessage.getDisplayMessageBody();

            // Dispatch to WebView via JavaScript
            String js = String.format(
                "window.dispatchEvent(new CustomEvent('sms_received', { detail: { sender: '%s', body: '%s' } }));",
                sender.replace("'", "\\'"),
                body.replace("'", "\\'").replace("\n", "\\n")
            );

            // Access MainActivity's WebView and execute JS
            if (MainActivity.webView != null) {
                MainActivity.webView.post(() -> {
                    MainActivity.webView.evaluateJavascript(js, null);
                });
            }
        }
    }
}
