// ==UserScript==
// @name         Listen On YouTube
// @namespace    http://tampermonkey.net/
// @version      2026-02-15
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
        <ytlmusic-menu-navigation-item-renderer class="style-scope ytmusic-menu-popup-renderer" role="menuitem" tabindex="-1" aria-disabled="false" aria-selected="false">
            <!--css-build:shady-->
            <!--css-build:shady-->
            <a id="navigation-endpoint" class="yt-simple-endpoint style-scope ytmusic-menu-navigation-item-renderer" tabindex="-1" target="_blank">
                <ytl-icon class="icon style-scope ytmusic-menu-navigation-item-renderer" aria-hidden="" style="width: 18px; height: 18px;">
                    <!--css-build:shady-->
                    <!--css-build:shady-->
                    <span class="yt-icon-shape style-scope yt-icon ytSpecIconShapeHost">
                        <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                            <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
                                <path d="M 8.9913 14.701 c 0 0 5.1689 0 6.451 -0.3414 c 0.7219 -0.1935 1.2648 -0.751 1.4554 -1.4395 C 17.25 11.657 17.25 9 17.25 9 c 0 0 0 -2.64 -0.3523 -3.8918 c -0.1906 -0.7055 -0.7335 -1.2517 -1.4554 -1.4395 c -1.2821 -0.3471 -6.451 -0.3471 -6.451 -0.3471 c 0 0 -5.1573 0 -6.4337 0.3471 c -0.7103 0.1878 -1.2648 0.7339 -1.4669 1.4395 c -0.3407 1.2518 -0.3407 3.8918 -0.3407 3.8918 c 0 0 0 2.657 0.3407 3.9202 c 0.2021 0.6885 0.7566 1.246 1.4669 1.4395 C 3.834 14.701 8.9913 14.701 8.9913 14.701 Z M 7.35 6.525 l 4.125 2.475 l -4.125 2.475 V 6.525 Z"></path>
                            </svg>
                        </div>
                    </span>
                </ytl-icon>
                <ytl-formatted-string class="text style-scope ytmusic-menu-navigation-item-renderer">Listen on YouTube</yt-formatted-string>
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

        if (!document.querySelector("ytlmusic-menu-navigation-item-renderer") && getButton(listBox, "Start mix")) {

            const shareButton = getButton(listBox, "Share");
            const radioButton = getButton(listBox, "Start mix");

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