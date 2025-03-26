// ==UserScript==
// @name         Listen On YouTube
// @namespace    http://tampermonkey.net/
// @version      2025-03-26
// @description  Adds "Listen on YouTube" button to YouTube Music.
// @author       Neil Patrao
// @match        *://music.youtube.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

// Trusted-Types fix for Chrome (Add this line above before the jQuery @require)
// @require      data:text/plain;base64,d2luZG93LnRydXN0ZWRUeXBlcy5jcmVhdGVQb2xpY3koJ2RlZmF1bHQnLCB7IGNyZWF0ZUhUTUw6IHN0ciA9PiBzdHIsIGNyZWF0ZVNjcmlwdFVSTDogc3RyPT4gc3RyLCBjcmVhdGVTY3JpcHQ6IHN0cj0+IHN0ciB9KTs=

(function() {

    const STYLES = `
        tp-ytl-paper-listbox.ytmusic-menu-popup-renderer {
            width: 240px;
            padding: 16px 0;
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 2px;
        }
        tp-ytl-paper-listbox {
            display: block;
            padding: 8px 0;
            background: var(--paper-listbox-background-color,var(--primary-background-color));
            color: var(--paper-listbox-color,var(--primary-text-color));
            border: var(--paper-listbox-border);
        }
        ytlmusic-menu-navigation-item-renderer {
            display: block;
            --iron-icon-fill-color: #fff;
        }
        ytl-icon, .yt-icon-container.yt-icon {
            display: inline-flexbox;
            display: -moz-inline-box;
            display: inline-flex;
            -moz-box-align: center;
            align-items: center;
            -moz-box-pack: center;
            justify-content: center;
            position: relative;
            vertical-align: middle;
            fill: var(--iron-icon-fill-color,currentcolor);
            stroke: var(--iron-icon-stroke-color,none);
            width: var(--iron-icon-width,24px);
            height: var(--iron-icon-height,24px);
            animation: var(--iron-icon-animation);
            margin-top: var(--iron-icon-margin-top);
            margin-right: var(--iron-icon-margin-right);
            margin-bottom: var(--iron-icon-margin-bottom);
            margin-left: var(--iron-icon-margin-left);
            padding: var(--iron-icon-padding);
        }
    `;

    GM_addStyle(STYLES);

    const BUTTON = $(`
        <ytlmusic-menu-navigation-item-renderer class="style-scope ytmusic-menu-popup-renderer iron-selected" role="menuitem" tabindex="0" aria-disabled="false" aria-selected="true">
            <!--css-build:shady--><!--css-build:shady-->
            <a id="navigation-endpoint" class="yt-simple-endpoint style-scope ytmusic-menu-navigation-item-renderer" tabindex="-1" target="_blank">
                <ytl-icon class="icon style-scope ytmusic-menu-navigation-item-renderer">
                    <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;" class="style-scope yt-icon">
                        <g class="style-scope yt-icon">
                            <path d="M 11.9895 18.9103 c 0 0 6.2653 0 7.8194 -0.4138 c 0.875 -0.2345 1.5331 -0.9103 1.7641 -1.7448 c 0.427 -1.5311 0.427 -4.7517 0.427 -4.7517 c 0 0 0 -3.2 -0.427 -4.7173 c -0.231 -0.8552 -0.8891 -1.5172 -1.7641 -1.7448 c -1.5541 -0.4207 -7.8194 -0.4207 -7.8194 -0.4207 c 0 0 -6.2513 0 -7.7984 0.4207 c -0.861 0.2276 -1.5331 0.8896 -1.7781 1.7448 c -0.413 1.5173 -0.413 4.7173 -0.413 4.7173 c 0 0 0 3.2206 0.413 4.7517 c 0.245 0.8345 0.9171 1.5103 1.7781 1.7448 C 5.7382 18.9103 11.9895 18.9103 11.9895 18.9103 z M 10 9 l 5 3 l -5 3 V 9 z" class="style-scope yt-icon"></path>
                        </g>
                    </svg>
                    <!--css-build:shady--><!--css-build:shady-->
                </ytl-icon>
                <ytl-formatted-string class="text style-scope ytmusic-menu-navigation-item-renderer">Listen on YouTube</ytl-formatted-string>
            </a>
        </ytlmusic-menu-navigation-item-renderer>
    `);

    function resolveSelector(selector, index = 0, root = document) {
        return new Promise(resolve => {
            if (root.querySelectorAll(selector)[index]) {
                return resolve(root.querySelectorAll(selector)[index]);
            }
            var observer = new MutationObserver(mutations => {
                if (root.querySelectorAll(selector)[index]) {
                    resolve(root.querySelectorAll(selector)[index]);
                    observer.disconnect();
                }
            });
            observer.observe(document.body,{childList: true, subtree: true});
        });
    }

    function formatUrl(url) {
        let baseUrl = "https://www.youtube.com/";
    
        if (url.startsWith("watch?playlist=RDAMPL")) {
            return baseUrl + url.replace("watch?playlist=RDAMPL", "playlist?list=");
        }
    
        if (url.includes("&list=RDAMVM")) {
            return baseUrl + url.replace(/&list=RDAMVM[^&]+/, "");
        }
    
        return baseUrl + url; // Return unchanged if no modification is needed
    }

    function getButton(listBox, buttonName) {
        const buttons = listBox.querySelectorAll("ytmusic-menu-navigation-item-renderer");

        return Array.from(buttons).find(button => 
            button.querySelector("yt-formatted-string")?.innerHTML.trim() === buttonName
        );
    }

    function addButton(listBox) {

        if (!document.querySelector("ytlmusic-menu-navigation-item-renderer") && getButton(listBox, "Start radio")) {

            const shareButton = getButton(listBox, "Share");
            const radioButton = getButton(listBox, "Start radio");

            BUTTON.find("a").attr("href", formatUrl(radioButton.querySelector("a").getAttribute("href")));

            shareButton.before(BUTTON[0])
        }
    }

    resolveSelector("ytmusic-menu-popup-renderer > tp-yt-paper-listbox").then((listBox) => {

        addButton(listBox);
        var listBoxObserver = new MutationObserver(mutations => {addButton(listBox);});
        listBoxObserver.observe(listBox, {childList: true});

    });

})();