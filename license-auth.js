(() => {
  'use strict';
  const BUILD='Build1559';
  const PORTAL_BASE='https://g-link-portal.pages.dev';
  const OFFLINE_GRACE_MS=72*60*60*1000;
  const LOCAL_KEY='gLink_standardAuthRemembered';
  const SESSION_KEY='gLink_standardAuthSession';
  const ONBOARDED_KEY='gLink_organizationPasswordConfigured';
  const REMEMBER_PREF_KEY='gLink_standardRememberLogin';
  const LOCATION_PREF_KEY='gLink_standardRecordLocation';
  let gate=null,statusBar=null,currentState=null;

  function readState(){for(const store of [sessionStorage,localStorage]){try{const raw=store.getItem(store===localStorage?LOCAL_KEY:SESSION_KEY);if(raw)return {...JSON.parse(raw),storage:store===localStorage?'local':'session'};}catch(e){}}return null;}
  function saveState(state,remember){clearState();const payload=JSON.stringify({...state,remember:Boolean(remember)});(remember?localStorage:sessionStorage).setItem(remember?LOCAL_KEY:SESSION_KEY,payload);currentState={...state,remember:Boolean(remember),storage:remember?'local':'session'};}
  function clearState(){try{localStorage.removeItem(LOCAL_KEY);}catch(e){}try{sessionStorage.removeItem(SESSION_KEY);}catch(e){}currentState=null;}
  function api(path,options={}){
    const controller=new AbortController();
    const timeoutMs=Number(options.timeoutMs||15000);
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    const requestOptions={...options,signal:controller.signal,headers:{'Content-Type':'application/json',...(options.headers||{})},cache:'no-store'};
    delete requestOptions.timeoutMs;
    return fetch(`${PORTAL_BASE}${path}`,requestOptions)
      .then(response=>response)
      .catch(error=>{if(error.name==='AbortError')throw new Error(`Portal認証APIが${Math.round(timeoutMs/1000)}秒以内に応答しませんでした。`);throw error;})
      .finally(()=>clearTimeout(timer));
  }
  function noLocationData(){return {latitude:null,longitude:null,accuracy:null,permission:'not_requested'};}
  function readPreference(key,defaultValue=true){try{const v=localStorage.getItem(key);return v===null?defaultValue:v==='1';}catch(e){return defaultValue;}}
  function writePreference(key,value){try{localStorage.setItem(key,value?'1':'0');}catch(e){}}
  function captureLocationData(){
    const base={latitude:null,longitude:null,accuracy:null,permission:'not_requested'};
    if(!('geolocation' in navigator))return Promise.resolve({...base,permission:'unsupported'});
    return new Promise(resolve=>{
      let finished=false;
      const done=value=>{if(!finished){finished=true;resolve({...base,...value});}};
      navigator.geolocation.getCurrentPosition(
        position=>done({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,permission:'granted'}),
        error=>done({permission:error.code===1?'denied':error.code===3?'timeout':'unavailable'}),
        {enableHighAccuracy:false,timeout:5000,maximumAge:300000}
      );
      setTimeout(()=>done({permission:'timeout'}),5500);
    });
  }
  async function parseResponse(response){let data={};try{data=await response.json();}catch(e){data={message:`PortalからJSON以外の応答を受信しました。HTTP ${response.status}`};}if(!response.ok){const err=new Error(data.message||`HTTP ${response.status}`);err.status=response.status;err.data=data;throw err;}return data;}
  function appRoot(){return document.body||document.documentElement;}
  function hideApp(){appRoot()?.classList.add('glink-auth-hidden-app');}
  function showApp(){appRoot()?.classList.remove('glink-auth-hidden-app');if(gate)gate.hidden=true;}
  function isOnboarded(){try{return localStorage.getItem(ONBOARDED_KEY)==='1';}catch(e){return false;}}
  function createGate(){if(gate)return gate;const onboarded=isOnboarded();gate=document.createElement('section');gate.id='glinkAuthGate';gate.hidden=true;gate.innerHTML=`<div class="glink-auth-card"><div class="glink-auth-logo">G</div><p class="glink-auth-kicker">G-LINK STANDARD</p><h1 id="glinkAuthTitle" class="glink-auth-title">${onboarded?'利用機関ログイン':'ライセンス認証'}</h1><p id="glinkAuthLead" class="glink-auth-lead">${onboarded?'ライセンスIDと各機関専用パスワードを入力してください。':'管理者から発行されたライセンスIDと初期パスワードを入力してください。'}</p><form id="glinkAuthForm"><div class="glink-auth-field"><label for="glinkLicenseId">ライセンスID</label><input id="glinkLicenseId" autocomplete="username" placeholder="GL-000001" required></div><div class="glink-auth-field"><label for="glinkLicensePassword">パスワード</label><input id="glinkLicensePassword" type="password" autocomplete="current-password" required></div><div class="glink-login-options"><p class="glink-login-options-title">ログインオプション</p><label class="glink-auth-remember"><input id="glinkRemember" type="checkbox" checked><span>この端末でログイン状態を保持する<br><small>共用端末ではチェックを外してください。</small></span></label><label class="glink-auth-remember"><input id="glinkRecordLocation" type="checkbox"><span>ログイン地域を記録する（推奨）<br><small>OFFの場合はIP推定または登録地域を使用します。</small></span></label></div><p class="glink-location-note">位置情報を許可しない場合もログインできます。正確な位置座標は保存されません。</p><button id="glinkAuthSubmit" class="glink-auth-button" type="submit">${onboarded?'ログインして起動':'認証して次へ'}</button><p id="glinkAuthMessage" class="glink-auth-message" aria-live="polite"></p></form><p class="glink-auth-note">通信障害時は、最後の正常認証から72時間以内に限りオフライン起動できます。Command機能はオフライン中は利用できません。</p></div>`;document.documentElement.appendChild(gate);gate.querySelector('#glinkAuthForm').addEventListener('submit',login);const remember=gate.querySelector('#glinkRemember');const record=gate.querySelector('#glinkRecordLocation');remember.checked=readPreference(REMEMBER_PREF_KEY,true);record.checked=readPreference(LOCATION_PREF_KEY,false);remember.addEventListener('change',()=>writePreference(REMEMBER_PREF_KEY,remember.checked));record.addEventListener('change',()=>writePreference(LOCATION_PREF_KEY,record.checked));return gate;}
  function message(text,success=false){createGate();const el=gate.querySelector('#glinkAuthMessage');el.textContent=text||'';el.classList.toggle('success',success);}
  function showLogin(text=''){hideApp();createGate().hidden=false;message(text);setTimeout(()=>gate.querySelector('#glinkLicenseId')?.focus(),0);}
  function showStatus(state,offline=false){
    if(statusBar){statusBar=null;}
    const stage=document.getElementById('launcherStage');
    if(!stage)return;
    let rail=stage.querySelector('#glinkStatusRail');
    if(!rail){rail=document.createElement('div');rail.id='glinkStatusRail';rail.className='glink-status-rail';stage.appendChild(rail);}
    rail.querySelector('#glinkOrgStatusIcon')?.remove();
    rail.querySelector('#glinkLicenseBadge')?.remove();
    rail.querySelector('#glinkLogoutIcon')?.remove();
    const logoutIcon=document.createElement('button');
    logoutIcon.type='button';
    logoutIcon.id='glinkLogoutIcon';
    logoutIcon.className='glink-status-icon glink-status-logout';
    logoutIcon.style.order='2';
    logoutIcon.textContent='🚪';
    logoutIcon.setAttribute('aria-label','ログアウト');
    logoutIcon.title='ログアウト';
    logoutIcon.addEventListener('click',()=>{
      if(window.confirm('G-Linkからログアウトしますか？')) logout();
    });
    rail.appendChild(logoutIcon);
    statusBar=rail;
  }
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function offlineRemaining(state){const left=Math.max(0,OFFLINE_GRACE_MS-(Date.now()-Date.parse(state.lastValidatedAt||0)));const h=Math.floor(left/3600000);const m=Math.floor((left%3600000)/60000);return `${h}時間${m}分`;}
  function canOffline(state){const t=Date.parse(state?.lastValidatedAt||'');return Boolean(state?.token&&Number.isFinite(t)&&Date.now()-t<=OFFLINE_GRACE_MS&&state?.organization?.standard);}
  function activate(state,offline=false){currentState=state;try{localStorage.setItem(ONBOARDED_KEY,'1');}catch(e){}showApp();showStatus(state,offline);window.GLinkLicense={authenticated:true,offline,organization:state.organization,commandEnabled:Boolean(state.organization?.command&&!offline),portalBase:PORTAL_BASE,build:BUILD};window.dispatchEvent(new CustomEvent('glink-license-ready',{detail:window.GLinkLicense}));}
  async function validate(state){try{const response=await api('/api/app/auth/validate',{method:'GET',headers:{Authorization:`Bearer ${state.token}`}});const data=await parseResponse(response);const next={...state,organization:data.organization,expiresAt:data.sessionExpiresAt,lastValidatedAt:new Date().toISOString()};saveState(next,state.remember);activate(next,false);}catch(error){if(error.status){clearState();showLogin(error.message||'再ログインしてください。');return;}if(canOffline(state)){activate(state,true);return;}showLogin('Portalへ接続できず、72時間のオフライン猶予も終了しています。通信環境を確認してください。');}}
  async function login(event){
    event.preventDefault();
    const button=gate.querySelector('#glinkAuthSubmit');
    button.disabled=true;
    const startedAt=Date.now();
    try{
      message('入力内容を確認しています。',true);
      const licenseId=gate.querySelector('#glinkLicenseId').value.trim().toUpperCase();
      const password=gate.querySelector('#glinkLicensePassword').value;
      const remember=gate.querySelector('#glinkRemember').checked;
      const recordLocation=gate.querySelector('#glinkRecordLocation').checked;
      writePreference(REMEMBER_PREF_KEY,remember);
      writePreference(LOCATION_PREF_KEY,recordLocation);

      message(recordLocation?'端末位置情報を確認しています。':'位置情報を使用せず認証を開始します。',true);
      const locationPayload=recordLocation?await captureLocationData():noLocationData();
      message('認証情報を確認しています。',true);

      const response=await api('/api/app/auth/login',{
        method:'POST',
        timeoutMs:15000,
        body:JSON.stringify({licenseId,password,remember,location:locationPayload})
      });

      const data=await parseResponse(response);


      if(data.mustChange){
        message('初期パスワード変更画面へ移動します。',true);
        if(!data.setupToken||!data.passwordChangeUrl)throw new Error('Portal応答に初期パスワード変更情報がありません。');
        const params=new URLSearchParams({setupToken:data.setupToken,remember:remember?'1':'0'});
        const destination=`${data.passwordChangeUrl}#${params.toString()}`;

        window.location.assign(destination);
        return;
      }

      message('認証情報を保存しています。',true);
      if(!data.token||!data.organization)throw new Error('Portal応答にログイン情報がありません。');
      const state={token:data.token,expiresAt:data.expiresAt,lastValidatedAt:new Date().toISOString(),organization:data.organization,remember};
      saveState(state,remember);
      message('認証に成功しました。',true);
      activate(state,false);
    }catch(error){
      console.error('[G-Link Auth] Login failed', error);
      message(error.message||'ログインに失敗しました。');
    }finally{
      button.disabled=false;
    }
  }
  async function logout(){const state=currentState||readState();clearState();try{if(state?.token)await api('/api/app/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${state.token}`}});}catch(e){}location.reload();}
  function decodeTransfer(value){try{let b=value.replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';const binary=atob(b);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes));}catch(e){return null;}}
  function readTransfer(){const match=location.hash.match(/(?:^#|&)glinkAuthTransfer=([^&]+)/);if(!match)return null;const state=decodeTransfer(decodeURIComponent(match[1]));history.replaceState(null,'',location.pathname+location.search);return state;}
  async function boot(){hideApp();createGate();const transfer=readTransfer();if(transfer?.token&&transfer?.organization){saveState(transfer,Boolean(transfer.remember));try{localStorage.setItem(ONBOARDED_KEY,'1');}catch(e){}activate(transfer,false);return;}const state=readState();if(!state){showLogin();return;}await validate(state);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
