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
                            <path d="M10.5,14.41V9.6l4.17,2.4L10.5,14.41z M8.48,8.45L7.77,7.75C6.68,8.83,6,10.34,6,12s0.68,3.17,1.77,4.25l0.71-0.71 C7.57,14.64,7,13.39,7,12S7.57,9.36,8.48,8.45z M16.23,7.75l-0.71,0.71C16.43,9.36,17,10.61,17,12s-0.57,2.64-1.48,3.55l0.71,0.71 C17.32,15.17,18,13.66,18,12S17.32,8.83,16.23,7.75z M5.65,5.63L4.95,4.92C3.13,6.73,2,9.24,2,12s1.13,5.27,2.95,7.08l0.71-0.71 C4.02,16.74,3,14.49,3,12S4.02,7.26,5.65,5.63z M19.05,4.92l-0.71,0.71C19.98,7.26,21,9.51,21,12s-1.02,4.74-2.65,6.37l0.71,0.71 C20.87,17.27,22,14.76,22,12S20.87,6.73,19.05,4.92z" class="style-scope yt-icon"></path>
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

    function getRadioLink(listBox) {
        const items = listBox.querySelectorAll("ytmusic-menu-navigation-item-renderer");

        for (var item of items) {
            if (item.querySelector("yt-formatted-string").innerHTML === "Start radio") {
                const link = item.querySelector("a").getAttribute("href");
                return formatUrl(link);
            }
        }

        return null;
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