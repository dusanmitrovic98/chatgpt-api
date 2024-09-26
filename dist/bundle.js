!function(){"use strict";console.log("Optimized script for full response capture initialized");const e={PORT:60001,LOG:!1,poolingFrequency:1e3,checkFrequency:250,waitingForResponse:!1,lastPrompt:"",canAskQuestion:!1,sendButtonActive:!1,stopButtonPresent:!1,stopButtonActive:!1,logs:[]},t=(t,o=null)=>{if(!e.LOG)return;const n=`${(new Date).toISOString()}: ${t}`;e.logs.push(n);const r=o?`color: ${o}`:"";console.log(`%c${n}`,r)},o=()=>{const o=document.querySelector('[data-testid="send-button"]'),n=document.querySelector('[data-testid="stop-button"]');e.sendButtonActive=o&&!o.disabled,e.stopButtonPresent=!!n,e.stopButtonActive=n&&!n.disabled,t("Send button: "+(e.sendButtonActive?"active":"disabled")),t("Stop button: "+(e.stopButtonPresent?e.stopButtonActive?"active":"disabled":"not present")),e.canAskQuestion=!e.sendButtonActive&&!e.stopButtonPresent&&!e.waitingForResponse,t(`Can ask question: ${e.canAskQuestion}`)};function n(e){if(!e||"function"!=typeof e.click)throw new Error("Invalid element or click method not available");e.click()}function r(e,t){if(!e||void 0===e.value&&void 0===e.textContent)throw new Error("Invalid element for text input");void 0!==e.value?e.value=t:e.textContent=t,e.dispatchEvent(new Event("input",{bubbles:!0}))}function s(){const e=document.querySelectorAll('[data-message-author-role="assistant"]');return e.length>0?e[e.length-1].textContent.trim():null}async function i(n=3e5){const r=Date.now();let i=null;for(;Date.now()-r<n;){await new Promise((t=>setTimeout(t,e.checkFrequency))),o();const n=s();if(n!==i&&(i=n,t("Response updated:","blue"),t(n)),!e.stopButtonPresent&&!e.sendButtonActive)return t("Response generation complete","green"),n}throw new Error("Timeout waiting for full response")}async function a(){const o=`http://localhost:${e.PORT}/latest-prompt`;return new Promise(((n,r)=>{GM_xmlhttpRequest({method:"GET",url:o,onload:o=>{try{const r=JSON.parse(o.responseText);r.prompt&&r.prompt!==e.lastPrompt?(t(`New prompt received: ${r.prompt}`),e.lastPrompt=r.prompt,n(r.prompt)):n(null)}catch(e){t("Error parsing server response: "+e.message,"red"),r(e)}},onerror:e=>{t("Error fetching latest prompt: "+e.message,"red"),r(e)}})}))}async function c(o){const n=`http://localhost:${e.PORT}/log-error`;return new Promise(((e,r)=>{GM_xmlhttpRequest({method:"POST",url:n,data:JSON.stringify({message:o}),headers:{"Content-Type":"application/json"},onload:o=>{t("Error logged to server: "+o.responseText),e()},onerror:e=>{t("Error logging error to server: "+e.message,"red"),r(e)}})}))}async function l(s){t(`Handling prompt: ${s}`),e.waitingForResponse=!0;try{const s=await async function(){let s=0;for(;s<5;)try{for(;!e.canAskQuestion;)await new Promise((t=>setTimeout(t,e.checkFrequency))),o();const s=document.querySelector('[contenteditable="true"]'),a=document.querySelector('[data-testid="send-button"]');if(!s||!a)throw new Error("Required elements not found. Retrying...");for(n(s),r(s,e.lastPrompt),await new Promise((e=>setTimeout(e,100)));!e.sendButtonActive;)await new Promise((t=>setTimeout(t,e.checkFrequency))),o();n(a),e.waitingForResponse=!0;const c=await i();if(!c)throw new Error("No response received from assistant");return t("Full Assistant's response:","green"),t(c),c}catch(e){if(t(`Attempt ${s+1} failed: ${e.message}`,"yellow"),s++,s>=5)throw t(`Max retries reached. Error: ${e.message}`,"red"),e;await new Promise((e=>setTimeout(e,1e3)))}finally{e.waitingForResponse=!1}}();if(!s)throw new Error("Failed to get a response from the assistant");await async function(o){const n=`http://localhost:${e.PORT}/log-response`;return new Promise(((e,r)=>{GM_xmlhttpRequest({method:"POST",url:n,data:JSON.stringify({response:o}),headers:{"Content-Type":"application/json"},onload:o=>{t("Response logged to server: "+o.responseText),window.location.reload(),e()},onerror:e=>{t("Error logging response: "+e.message,"red"),r(e)}})}))}(s)}catch(e){t("Error handling prompt: "+e.message,"red"),await c(e.message)}finally{e.waitingForResponse=!1}}new MutationObserver((()=>{o()})).observe(document.body,{childList:!0,subtree:!0}),o(),setInterval(o,e.checkFrequency),window.INTERACTION_STATE=e,async function(){for(;;){if(!e.waitingForResponse)try{const e=await a();e&&await l(e)}catch(e){t("Error in main loop: "+e.message,"red"),await c(e.message)}await new Promise((t=>setTimeout(t,e.poolingFrequency)))}}()}();