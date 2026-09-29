import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { FIREBASE_WEB_CONFIG } from "../lib/firebase-config";

type FirebaseWebConfig = typeof FIREBASE_WEB_CONFIG;

function recaptchaHtml(
  firebaseConfig: FirebaseWebConfig,
  languageCode: string,
  invisible: boolean,
) {
  const version = "8.10.1";
  return `<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <script src="https://www.gstatic.com/firebasejs/${version}/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/${version}/firebase-auth.js"></script>
  <script>firebase.initializeApp(${JSON.stringify(firebaseConfig)});</script>
  <style>
    html, body { height: 100%; ${invisible ? "padding:0;margin:0;" : ""} }
    #recaptcha-btn { width:100%;height:100%;padding:0;margin:0;border:0; }
  </style>
</head>
<body>
  ${invisible ? `<button id="recaptcha-btn" type="button" onclick="onClickButton()">Confirm reCAPTCHA</button>` : `<div id="recaptcha-cont" class="g-recaptcha"></div>`}
  <script>
    var fullChallengeTimer;
    function onVerify(token) {
      if (fullChallengeTimer) { clearInterval(fullChallengeTimer); fullChallengeTimer = undefined; }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token: token }));
    }
    function onLoad() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'load' }));
      firebase.auth().languageCode = ${JSON.stringify(languageCode)};
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(${JSON.stringify(invisible ? "recaptcha-btn" : "recaptcha-cont")}, {
        size: ${JSON.stringify(invisible ? "invisible" : "normal")},
        callback: onVerify
      });
      window.recaptchaVerifier.render();
    }
    function onError() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
    }
    function onClickButton() {
      if (!fullChallengeTimer) {
        fullChallengeTimer = setInterval(function() {
          var iframes = document.getElementsByTagName('iframe');
          var isFullChallenge = false;
          for (var i = 0; i < iframes.length; i++) {
            var parentWindow = iframes[i].parentNode ? iframes[i].parentNode.parentNode : undefined;
            var isHidden = parentWindow && parentWindow.style.opacity == 0;
            isFullChallenge = isFullChallenge || (
              !isHidden &&
              ((iframes[i].title === 'recaptcha challenge') ||
               (iframes[i].src.indexOf('google.com/recaptcha/api2/bframe') >= 0)));
          }
          if (isFullChallenge) {
            clearInterval(fullChallengeTimer);
            fullChallengeTimer = undefined;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fullChallenge' }));
          }
        }, 100);
      }
    }
    window.addEventListener('message', function(event) {
      if (event.data.verify) {
        var btn = document.getElementById('recaptcha-btn');
        if (btn) btn.click();
      }
    });
  </script>
  <script src="https://www.google.com/recaptcha/api.js?onload=onLoad&render=explicit&hl=${encodeURIComponent(languageCode)}" onerror="onError()"></script>
</body></html>`;
}

export function FirebaseRecaptcha({
  firebaseConfig,
  languageCode = "fr",
  invisible,
  verify,
  onVerify,
  onLoad,
  onError,
  onFullChallenge,
  style,
}: {
  firebaseConfig: FirebaseWebConfig;
  languageCode?: string;
  invisible?: boolean;
  verify?: boolean;
  onVerify: (token: string) => void;
  onLoad?: () => void;
  onError?: () => void;
  onFullChallenge?: () => void;
  style?: object;
}) {
  const webview = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (webview.current && loaded && verify) {
      webview.current.injectJavaScript(`
        (function(){
          window.dispatchEvent(new MessageEvent('message', {data: { verify: true }}));
        })();
        true;
      `);
    }
  }, [loaded, verify]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; token?: string };
      if (data.type === "load") {
        setLoaded(true);
        onLoad?.();
      } else if (data.type === "error") {
        onError?.();
      } else if (data.type === "verify" && data.token) {
        onVerify(data.token);
      } else if (data.type === "fullChallenge") {
        onFullChallenge?.();
      }
    } catch {
      onError?.();
    }
  };

  return (
    <WebView
      ref={webview}
      javaScriptEnabled
      originWhitelist={["*"]}
      mixedContentMode="always"
      source={{
        baseUrl: `https://${firebaseConfig.authDomain}`,
        html: recaptchaHtml(firebaseConfig, languageCode, Boolean(invisible)),
      }}
      onMessage={onMessage}
      onError={() => onError?.()}
      style={[styles.webview, style]}
    />
  );
}

const styles = StyleSheet.create({
  webview: { backgroundColor: "transparent" },
});
