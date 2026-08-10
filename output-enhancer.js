(() => {
'use strict';
const frame=document.getElementById('appFrame');if(!frame)return;
const STORAGE_KEY='banderolas-output-settings-v1';
let recorder=null,chunks=[],mediaData=null,mediaMime='',toastTimer=null,preview=false;

function ready(){
 const d=frame.contentDocument;if(!d)return;const $=id=>d.getElementById(id),panel=$('ui-panel'),canvas=$('glcanvas');if(!panel||!canvas)return;
 d.title='Banderolas Dinámicas — Output Lab';
 injectStyle(d);injectUI(d,panel,$);captureMedia($);wireSave(d,$);wireOutput(d,$,canvas);wirePreview(d,$);
 status(d,'READY');toast(d,'Output tools loaded');
}

function injectStyle(d){const s=d.createElement('style');s.textContent=`
.output-status{margin:10px 0;padding:8px 10px;border:1px solid #2f4936;background:#0b100d;color:#9fd3aa;font-size:10px;letter-spacing:.1em;text-transform:uppercase}.output-status.busy{border-color:#5b4a24;color:#e4c65d}.output-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.output-note{font-size:10px;line-height:1.45;color:#777;margin-top:8px}.output-result{min-height:16px;margin-top:8px;color:#9fd3aa;font-size:10px}.output-toast{position:fixed;right:350px;top:18px;z-index:9999;min-width:220px;max-width:340px;padding:11px 13px;border:1px solid #35513d;background:rgba(8,8,8,.95);color:#eee;font-size:11px;opacity:0;transform:translateY(-8px);transition:.2s;pointer-events:none}.output-toast.on{opacity:1;transform:none}.output-recording{position:absolute;right:18px;bottom:18px;z-index:40;display:none;padding:8px 10px;background:rgba(110,0,0,.76);border:1px solid rgba(255,90,90,.55);color:#fff;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.output-recording.on{display:block}.output-preview #ui-panel,.output-preview #overlay-text,.output-preview #cursor{display:none!important}.output-preview #canvas-container{width:100vw!important;flex:1!important}.output-exit{position:fixed;top:14px;right:14px;z-index:99999;display:none;padding:8px 10px;background:rgba(0,0,0,.65);border:1px solid #555;color:#ddd;font-family:monospace;font-size:10px}.output-preview .output-exit{display:block}@media(max-width:700px){.output-toast{right:18px}}
`;d.head.appendChild(s)}

function injectUI(d,panel,$){
 const header=panel.querySelector('.panel-header');const st=d.createElement('div');st.id='outputStatus';st.className='output-status';st.textContent='READY';header.insertAdjacentElement('afterend',st);
 const toastEl=d.createElement('div');toastEl.id='outputToast';toastEl.className='output-toast';d.body.appendChild(toastEl);
 const rec=d.createElement('div');rec.id='outputRecording';rec.className='output-recording';rec.textContent='● Recording';$('canvas-container').appendChild(rec);
 const exit=d.createElement('button');exit.id='outputExit';exit.className='output-exit';exit.textContent='EXIT PREVIEW · ESC';d.body.appendChild(exit);
 const exportBtn=$('btn-export');exportBtn.textContent='DOWNLOAD PNG';
 const box=d.createElement('div');box.className='form-group';box.id='outputTools';box.innerHTML=`<label>Project & Output</label><div class="output-grid"><button class="btn btn-outline" id="saveProject">Save</button><button class="btn btn-outline" id="restoreProject">Restore</button></div><button class="btn btn-outline" id="previewClean">Preview Clean</button><div class="output-grid"><button class="btn btn-outline" id="recordWebm">Record WebM</button><button class="btn btn-outline" id="stopWebm">Stop</button></div><button class="btn btn-solid" id="downloadHtml">Download Standalone HTML</button><button class="btn btn-outline" id="copyEmbed">Copy Embed</button><div class="output-note">Video recording uses the WebGL canvas directly via captureStream(), so cloth motion and animated media are captured without the editor UI. Standalone HTML reopens the experience with the current text and media state.</div><div class="output-result" id="outputResult"></div>`;
 exportBtn.insertAdjacentElement('afterend',box);
}

function captureMedia($){const input=$('media-upload');if(!input)return;input.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(!f)return;mediaMime=f.type;const r=new FileReader();r.onload=()=>{mediaData=r.result};r.readAsDataURL(f)})}

function collect($){return{title:$('input-title').value,caseStr:$('input-case').value,date:$('input-date').value,content:$('input-content').value,signature:$('input-signature').value}}
function apply($,s){if(!s)return;$('input-title').value=s.title||'';$('input-case').value=s.caseStr||'';$('input-date').value=s.date||'';$('input-content').value=s.content||'';$('input-signature').value=s.signature||'';['input-title','input-case','input-date','input-content','input-signature'].forEach(id=>$(id).dispatchEvent(new Event('input',{bubbles:true}))}
function wireSave(d,$){$('saveProject').onclick=()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(collect($)));status(d,'PROJECT SAVED');toast(d,'✓ Project saved')};$('restoreProject').onclick=()=>{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return toast(d,'No saved project found');apply($,JSON.parse(raw));status(d,'PROJECT RESTORED');toast(d,'✓ Project restored')}}

function wirePreview(d,$){const enter=()=>{preview=true;d.body.classList.add('output-preview');status(d,'PREVIEW')},exit=()=>{preview=false;d.body.classList.remove('output-preview');status(d,'READY')};$('previewClean').onclick=enter;$('outputExit').onclick=exit;d.addEventListener('keydown',e=>{if(e.key==='Escape'&&preview)exit()})}

function wireOutput(d,$,canvas){
 $('recordWebm').onclick=()=>recordCanvas(d,$,canvas);$('stopWebm').onclick=()=>{if(recorder&&recorder.state==='recording')recorder.stop()};
 $('downloadHtml').onclick=()=>{const html=standalone(d,$);download(new Blob([html],{type:'text/html'}),'banderola-experience.html');$('outputResult').textContent='✓ Standalone HTML downloaded';toast(d,'✓ HTML downloaded')};
 $('copyEmbed').onclick=async()=>{const u=URL.createObjectURL(new Blob([standalone(d,$)],{type:'text/html'}));const code=`<iframe src="${u}" style="width:100%;aspect-ratio:16/9;border:0" allow="autoplay;fullscreen"></iframe>`;try{await navigator.clipboard.writeText(code);$('outputResult').textContent='✓ Temporary embed copied';toast(d,'✓ Embed copied')}catch{toast(d,'Clipboard blocked')}};
 $('btn-export').addEventListener('click',()=>{status(d,'PNG EXPORT');toast(d,'✓ PNG export requested')});
}

function recordCanvas(d,$,canvas){if(recorder&&recorder.state==='recording')return;try{const stream=canvas.captureStream(30);chunks=[];const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';recorder=new MediaRecorder(stream,{mimeType:mime});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{download(new Blob(chunks,{type:mime}),'banderola-recording.webm');$('outputRecording').classList.remove('on');status(d,'RECORDING DOWNLOADED');$('outputResult').textContent='✓ WebM downloaded';toast(d,'✓ Recording downloaded')};recorder.start(250);$('outputRecording').classList.add('on');status(d,'RECORDING…','busy');$('outputResult').textContent='Recording WebGL canvas at 30 FPS';toast(d,'● Recording started')}catch(e){status(d,'RECORD ERROR');toast(d,'Recording unavailable')}}

function standalone(d,$){
 const clone=d.documentElement.cloneNode(true);const body=clone.querySelector('body');
 const tools=clone.querySelector('#outputTools');if(tools)tools.remove();['#outputStatus','#outputToast','#outputRecording','#outputExit'].forEach(sel=>{const el=clone.querySelector(sel);if(el)el.remove()});
 const style=clone.ownerDocument.createElement('style');style.textContent='#ui-panel,#overlay-text,#cursor{display:none!important}#canvas-container{width:100vw!important;flex:1!important}body{overflow:hidden!important}';clone.querySelector('head').appendChild(style);
 const s=collect($);const payload=JSON.stringify({state:s,mediaData,mediaMime}).replace(/</g,'\\u003c');
 const rehydrate=clone.ownerDocument.createElement('script');rehydrate.textContent=`window.addEventListener('load',()=>{const P=${payload};const q=id=>document.getElementById(id);q('input-title').value=P.state.title||'';q('input-case').value=P.state.caseStr||'';q('input-date').value=P.state.date||'';q('input-content').value=P.state.content||'';q('input-signature').value=P.state.signature||'';['input-title','input-case','input-date','input-content','input-signature'].forEach(id=>q(id).dispatchEvent(new Event('input',{bubbles:true})));if(P.mediaData){if((P.mediaMime||'').startsWith('video/')){const v=q('hidden-video');v.src=P.mediaData;v.loop=true;v.muted=true;v.playsInline=true;v.play().catch(()=>{});platformState.mediaType='video';platformState.mediaElement=v;platformState.needsTextureUpdate=true}else if((P.mediaMime||'').startsWith('image/')){const im=new Image();im.onload=()=>{platformState.mediaType='image';platformState.mediaElement=im;platformState.needsTextureUpdate=true};im.src=P.mediaData}}});`;
 body.appendChild(rehydrate);return '<!DOCTYPE html>\n'+clone.outerHTML;
}

function download(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500)}
function status(d,t,k='ok'){const e=d.getElementById('outputStatus');if(!e)return;e.textContent=t;e.className='output-status'+(k==='busy'?' busy':'')}
function toast(d,t){const e=d.getElementById('outputToast');if(!e)return;clearTimeout(toastTimer);e.textContent=t;e.classList.add('on');toastTimer=setTimeout(()=>e.classList.remove('on'),2200)}
frame.addEventListener('load',ready,{once:true});
})();
