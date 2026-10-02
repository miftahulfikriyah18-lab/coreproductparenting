const D=window.GTD_DATA; const KEY='gtd_state_final_local_v1'; const BACKUP_MAGIC='GTD-JOURNEY'; const BACKUP_VERSION=1;
const LEGACY_KEYS=['gtd_state_v20','gtd_state_v10','gtd_state_v09'];
function loadInitialState(){let raw=localStorage.getItem(KEY);if(!raw){for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)break}}try{return raw?JSON.parse(raw):null}catch(e){return null}}
let state=loadInitialState()||{profile:{},checkup:{},starter:{answers:{}},days:{},journeyNotes:{},logs:[],parentChecks:[],savedWatch:[],savedActivities:[],journeyStartedAt:null,maintenance:{weeklyNote:''},meta:{familyId:(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now())),lastBackupAt:null,deviceAcknowledged:false}};
state.profile=state.profile||{};state.checkup=state.checkup||{};state.starter=state.starter||{answers:{}};state.starter.answers=state.starter.answers||{};state.days=state.days||{};state.journeyNotes=state.journeyNotes||{};state.logs=state.logs||[];state.parentChecks=state.parentChecks||[];state.savedWatch=state.savedWatch||[];state.savedActivities=state.savedActivities||[];state.maintenance=state.maintenance||{};state.maintenance.weeklyNote=state.maintenance.weeklyNote||'';state.maintenance.weeklyReviews=state.maintenance.weeklyReviews||[];state.maintenance.nextExperiment=state.maintenance.nextExperiment||'';state.meta=state.meta||{familyId:(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now())),lastBackupAt:null,deviceAcknowledged:false};
const app=document.getElementById('app');
function toast(message,type='ok'){let el=document.getElementById('gtd-toast');if(!el){el=document.createElement('div');el.id='gtd-toast';document.body.appendChild(el)}el.className='gtd-toast '+type;el.textContent=message;requestAnimationFrame(()=>el.classList.add('show'));clearTimeout(window.__gtdToastTimer);window.__gtdToastTimer=setTimeout(()=>el.classList.remove('show'),2800)}
function formatDateTimeID(iso){if(!iso)return 'Belum pernah';return new Date(iso).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function save(){state.meta=state.meta||{};if(!state.meta.familyId)state.meta.familyId=(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now()));localStorage.setItem(KEY,JSON.stringify(state));}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function ageBand(age){if(age<=4)return '3-5'; if(age<=7)return '5-7'; return '8-10';}
function profileReady(){return state.profile.name && state.profile.age;}
function nav(view){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view)); render(view);}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.view));
document.getElementById('reportBtn').onclick=()=>printReport(); document.getElementById('saveJourneyBtn').onclick=()=>backup();

function setProfile(form){
  const fd=new FormData(form);
  state.profile={name:String(fd.get('name')||'').trim(),age:+fd.get('age'),caregiver:String(fd.get('caregiver')||'').trim()||'Orang tua'};
  save();nav('starter');setTimeout(()=>toast('Profil keluarga tersimpan. Mulai dari Starter Lab singkat.'),0);
}
function saveCheckup(form){
  const fd=new FormData(form);
  let goals=fd.getAll('goals').map(String);
  const priority=String(fd.get('priorityGoal')||goals[0]||'conflict');
  if(!goals.includes(priority))goals.unshift(priority);
  let moments=fd.getAll('hardMoments').map(String);
  const other=String(fd.get('hardOther')||'').trim(); if(other)moments.push(other);
  state.checkup={
    baseline:+fd.get('baseline')||0,target:+fd.get('target')||0,
    goals,priorityGoal:priority,goal:priority,
    hardMoments:moments,hard:moments[0]||'',
    anchor:String(fd.get('anchor')||''),fav:String(fd.get('fav')||''),
    parentHabit:String(fd.get('parentHabit')||'Belum tahu')
  };
  save();nav('home');setTimeout(()=>toast('✓ Family Digital Plan tersimpan. Semua masalah tetap tercatat; satu fokus diprioritaskan dulu.'),0);
}
function makePlan(){
  const c=state.checkup,p=state.profile; const goals=selectedGoals(),moments=selectedMoments();
  if(!goals.length)return 'Lengkapi Digital Check-Up dulu.';
  return 'Fokus minggu ini untuk '+p.name+': '+goalLabel(c.priorityGoal||c.goal||goals[0])+'. Tujuan keluarga lain: '+goals.filter(g=>g!==(c.priorityGoal||c.goal)).map(goalLabel).join(', ')+(goals.length>1?'.': ' belum ditambahkan.')+' Momen yang perlu diperhatikan: '+(moments.join(', ')||'-')+'. Waktu bebas layar pertama: '+(c.anchor||'-')+'. Target durasi dapat direvisi berdasarkan catatan keluarga.';
}

function completedDays(){return Object.values(state.days).filter(Boolean).length;}
function blueprintReady(){return !!state.journeyStartedAt && elapsedProgramDays()>=14;}
function startJourney(){if(state.journeyStartedAt){renderJourney();return;}state.journeyStartedAt=new Date().toISOString();save();renderJourney();setTimeout(()=>toast('🎉 Program dimulai. Hari 1 sudah terbuka.'),0);}
function elapsedProgramDays(){if(!state.journeyStartedAt)return 0;const start=new Date(state.journeyStartedAt);const now=new Date();start.setHours(0,0,0,0);now.setHours(0,0,0,0);return Math.max(1,Math.floor((now-start)/86400000)+1);} function currentProgramDay(){return state.journeyStartedAt?Math.min(14,elapsedProgramDays()):0;}
function dayUnlocked(n){return !!state.journeyStartedAt && n<=currentProgramDay();}
function saveDay(n){const note=(document.getElementById('daynote'+n)?.value||'').trim();state.journeyNotes[n]=note;state.days[n]=true;save();renderJourney();setTimeout(()=>toast(`✓ Hari ${n} tersimpan.`),0);}


const GOAL_OPTIONS=[
  ['conflict','Mengurangi konflik saat berhenti'],
  ['duration','Mengatur durasi lebih konsisten'],
  ['content','Memilih konten yang lebih sesuai'],
  ['sleep','Melindungi rutinitas tidur'],
  ['connection','Menjaga waktu keluarga tanpa distraksi'],
  ['transition','Membantu anak berpindah ke aktivitas nyata'],
  ['modeling','Memperbaiki teladan digital orang tua']
];
const MOMENT_OPTIONS=[
  'Saat makan','Saat belajar/tugas','Saat waktu keluarga/kebersamaan','Menjelang tidur',
  'Saat bangun/pagi','Saat orang tua sibuk','Saat diminta berhenti','Hampir sepanjang hari meminta layar'
];
function goalLabel(id){return (GOAL_OPTIONS.find(g=>g[0]===id)||[null,id||'-'])[1]}
function selectedGoals(){const c=state.checkup||{};return Array.isArray(c.goals)&&c.goals.length?c.goals:(c.goal?[c.goal]:[])}
function selectedMoments(){const c=state.checkup||{};return Array.isArray(c.hardMoments)&&c.hardMoments.length?c.hardMoments:(c.hard?[c.hard]:[])}
function checkboxGrid(name,items,selected){
  return '<div class="choice-grid">'+items.map(([value,label])=>'<label class="choice-chip"><input type="checkbox" name="'+name+'" value="'+esc(value)+'" '+(selected.includes(value)?'checked':'')+'><span>'+esc(label)+'</span></label>').join('')+'</div>';
}
function momentGrid(selected){
  return '<div class="choice-grid">'+MOMENT_OPTIONS.map(v=>'<label class="choice-chip"><input type="checkbox" name="hardMoments" value="'+esc(v)+'" '+(selected.includes(v)?'checked':'')+'><span>'+esc(v)+'</span></label>').join('')+'</div>';
}
const STARTER_LAB=[
  {id:'age',icon:'🧩',title:'Ekspektasi sesuai usia',scenario:'Anak 3 tahun ingin mematikan TV sendiri tetapi lambat. Orang tua sedang terburu-buru.',choices:['Ambil remote dan selesaikan sendiri agar cepat.','Beri satu instruksi sederhana dan waktu singkat agar anak mencoba.','Ancam tidak boleh menonton besok kalau lambat.'],best:1,feedback:'Kemandirian tumbuh lewat kesempatan kecil yang sesuai kemampuan. Orang tua tetap boleh membantu, tetapi tidak perlu mengambil alih semua langkah.'},
  {id:'discipline',icon:'🧭',title:'Disiplin tanpa menyakiti',scenario:'Timer berbunyi. Anak menangis dan meminta satu video lagi.',choices:['Tambahkan satu video supaya cepat tenang.','Akui kecewanya, pertahankan batas, lalu bantu pindah ke kegiatan berikutnya.','Marahi karena tidak menepati janji.'],best:1,feedback:'Batas dan kehangatan bisa hadir bersamaan. Tujuannya bukan memenangkan pertengkaran, tetapi membantu anak melewati transisi dengan aturan yang tetap jelas.'},
  {id:'communication',icon:'💬',title:'Komunikasi jujur dan hangat',scenario:'Anak bertanya sesuatu yang orang tua belum tahu jawabannya.',choices:['Mengarang jawaban supaya anak puas.','Katakan belum tahu, jawab sesederhana yang diketahui, lalu cari tahu bersama.','Alihkan topik agar anak berhenti bertanya.'],best:1,feedback:'Pertanyaan anak adalah kesempatan membangun rasa ingin tahu dan kepercayaan. Jawaban tidak harus panjang; yang penting jujur, sesuai usia, dan membuka dialog.'},
  {id:'tech',icon:'🌉',title:'Teknologi sebagai jembatan, bukan tujuan akhir',scenario:'Anak baru selesai menonton video tentang warna.',choices:['Biarkan algoritma memilih video berikutnya.','Matikan layar lalu cari warna yang sama pada benda di rumah.','Minta anak mengulang isi video seperti tes.'],best:1,feedback:'Konten digital menjadi lebih bermakna ketika disambungkan ke percakapan, gerak, permainan, atau pengalaman nyata.'},
  {id:'model',icon:'🪞',title:'Keteladanan & adab digital',scenario:'Saat waktu keluarga, anak meminta HP sambil menunjuk orang tua yang sedang scrolling.',choices:['Katakan HP orang tua berbeda karena untuk orang dewasa.','Akui sedang pegang HP, simpan jika memang bukan kebutuhan mendesak, lalu kembali ke waktu keluarga.','Suruh anak tidak ikut campur.'],best:1,feedback:'Aturan lebih mudah dipahami ketika orang tua juga menunjukkan perilaku yang sejalan dan melakukan repair ketika tidak konsisten.'},
  {id:'explore',icon:'🔎',title:'Eksplorasi',scenario:'Anak membuat menara yang terus jatuh lalu mencoba susunan lain.',choices:['Tunjukkan cara yang benar agar cepat berhasil.','Tanya apa yang ia perhatikan dan beri ruang mencoba lagi dengan aman.','Hentikan karena berantakan.'],best:1,feedback:'Eksplorasi berarti anak punya ruang mengamati, memprediksi, mencoba, mengubah strategi, dan menceritakan temuannya.'},
  {id:'capable',icon:'🌱',title:'Rasa mampu',scenario:'Anak akhirnya menemukan lima benda merah setelah sempat kesulitan.',choices:['“Pintar banget!”','“Tadi baru ketemu tiga, lalu kamu cari lagi sampai dapat lima. Yuk kita hitung bersama.”','“Nah, kan sebenarnya gampang.”'],best:1,feedback:'Respons yang menyebut usaha, strategi, pilihan, atau kontribusi membantu anak memahami apa yang ia lakukan—bukan hanya mengejar label “pintar”.'}
];
function starterDone(){return Object.keys(state.starter?.answers||{}).length>=STARTER_LAB.length}
function starterChoice(id,idx){state.starter=state.starter||{answers:{}};state.starter.answers=state.starter.answers||{};state.starter.answers[id]=idx;state.starter.reviewId=id;save();renderStarter();}
function starterNext(){if(state.starter)state.starter.reviewId=null;save();renderStarter();}
function resetStarter(){state.starter={answers:{}};save();renderStarter();}
function renderStarter(){
  if(!profileReady())return renderOnboard();
  const ans=state.starter?.answers||{}; const done=Object.keys(ans).length; const reviewId=state.starter?.reviewId;
  if(reviewId){
    const s=STARTER_LAB.find(z=>z.id===reviewId),chosen=ans[reviewId],aligned=chosen===s.best;
    app.innerHTML='<div class="row space"><div><span class="pill">'+done+'/7 selesai</span><h1>Parenting Starter Lab</h1></div></div><section class="card starter-card"><div class="starter-icon">'+s.icon+'</div><div class="label">'+esc(s.title)+'</div><h2>'+(aligned?'Respons ini paling sejalan dengan arah latihan':'Ada respons yang lebih sejalan dengan arah latihan')+'</h2><div class="scenario">'+esc(s.scenario)+'</div><div class="starter-feedback '+(aligned?'good':'learn')+'"><b>Pilihanmu:</b> '+esc(s.choices[chosen])+'<br><br><b>Kenapa?</b> '+esc(s.feedback)+'</div><button class="primary" style="margin-top:16px" onclick="starterNext()">'+(done>=STARTER_LAB.length?'Lihat ringkasan →':'Lanjut skenario berikutnya →')+'</button></section>';
    return;
  }
  const current=STARTER_LAB.find(s=>ans[s.id]===undefined);
  if(!current){
    app.innerHTML='<section class="card hero starter-complete"><span class="pill ok">7/7 selesai</span><h1>Parenting Starter Lab selesai</h1><p class="sub">Kamu sudah melihat tujuh situasi inti. Prinsipnya tidak perlu dihafal—aplikasi akan memunculkannya lagi saat relevan di timer, check-in, aktivitas, dan AI Coach.</p><div class="starter-summary">'+STARTER_LAB.map(s=>'<div><span>'+s.icon+'</span><b>'+esc(s.title)+'</b></div>').join('')+'</div><div class="row" style="margin-top:18px"><button class="primary" onclick="nav(\'checkup\')">Lanjut Family Digital Check-Up →</button><button class="ghost" onclick="resetStarter()">Ulangi Starter Lab</button></div><div class="small" style="margin-top:14px">Microlearning ini dirumuskan ulang dari materi parenting berlisensi milik pemilik produk dan sumber perkembangan/pengasuhan yang dicantumkan di menu Sumber & Batasan; bukan salinan video, slide, atau transkrip.</div></section>';
    return;
  }
  app.innerHTML='<div class="row space"><div><span class="pill">'+done+'/7 selesai</span><h1>Parenting Starter Lab</h1><p class="sub">Bukan ebook dan bukan video. Pilih respons pada situasi nyata; lihat alasan singkatnya.</p></div><button class="ghost" onclick="nav(\'checkup\')">Lewati dulu</button></div><div class="progress" style="margin-bottom:18px"><div style="width:'+(done/STARTER_LAB.length*100)+'%"></div></div><section class="card starter-card"><div class="starter-icon">'+current.icon+'</div><div class="label">Microlearning '+(done+1)+' dari '+STARTER_LAB.length+'</div><h2>'+esc(current.title)+'</h2><div class="scenario">'+esc(current.scenario)+'</div><div class="starter-choices">'+current.choices.map((c,i)=>'<button class="choice-btn" onclick="starterChoice(\''+current.id+'\','+i+')">'+String.fromCharCode(65+i)+'. '+esc(c)+'</button>').join('')+'</div><div class="small">Tidak sedang menilai “orang tua baik/buruk”. Tujuannya latihan mengambil keputusan kecil sebelum situasi nyata terjadi.</div></section>';
}
function practiceSpotlight(){
  if(!state.journeyStartedAt)return '<section class="card practice-spot"><div class="label">Sebelum mulai 14 hari</div><h2>Latih prinsip lewat situasi, bukan hafalan</h2><p>Parenting Starter Lab memakai skenario singkat agar prinsip muncul sebagai keputusan nyata.</p><button class="ghost" onclick="nav(\'starter\')">'+(starterDone()?'Buka kembali Starter Lab':'Mulai Starter Lab')+'</button></section>';
  const n=currentProgramDay(),p=principleForDay(n);
  const action={steady:'Saat batas diuji hari ini: akui perasaan, ulangi batas singkat, lalu bantu langkah berikutnya.',bridge:'Sebelum layar dimulai, pilih satu kegiatan nyata yang siap dilakukan setelahnya.',explore:'Setelah layar, gunakan satu pertanyaan observasi dan beri ruang anak mencoba.',capable:'Setelah anak mencoba, sebutkan usaha atau strategi spesifik yang kamu lihat.'}[p.id];
  return '<section class="card practice-spot"><div class="label">Praktik hari '+n+'</div><h2>'+p.icon+' '+esc(p.title)+'</h2><p>'+esc(action)+'</p><span class="pill">akan muncul lagi saat relevan</span></section>';
}

const CORE_PRINCIPLES=[
  {id:'steady',icon:'🧭',title:'Tegas tanpa reaktif',short:'Batas jelas, respons tetap tenang.',desc:'Akui perasaan tanpa melepas batas. Instruksi dibuat singkat, konkret, dan tidak mempermalukan.'},
  {id:'bridge',icon:'🌉',title:'Teknologi → pengalaman nyata',short:'Layar selalu punya jembatan keluar.',desc:'Tontonan atau permainan digital disambungkan ke percakapan, gerak, permainan, tugas nyata, atau kebersamaan.'},
  {id:'explore',icon:'🔎',title:'Eksplorasi',short:'Anak diberi ruang mengamati dan mencoba.',desc:'Sesudah layar, anak diajak bertanya, memprediksi, mencoba, mengubah cara, dan menceritakan temuannya.'},
  {id:'capable',icon:'🌱',title:'Rasa mampu',short:'Fokus pada usaha, strategi, dan kontribusi.',desc:'Respons orang tua menyoroti proses dan pilihan anak, bukan hanya hasil sempurna atau kepatuhan.'}
];
function principleById(id){return CORE_PRINCIPLES.find(p=>p.id===id)||CORE_PRINCIPLES[0]}
function principleForDay(n){
  if([5,6,7,12,13].includes(n))return principleById('steady');
  if([4,8,9].includes(n))return principleById('bridge');
  if([1,2,3,10].includes(n))return principleById('explore');
  return principleById('capable');
}
function principlesHTML(compact=false){
  return `<section class="card principles-wrap ${compact?'compact':''}"><div class="row space"><div><div class="label">Kompas Gadget Tanpa Drama</div><h2>4 prinsip yang dipakai di seluruh sistem</h2></div><span class="pill">bukan sekadar halaman teori</span></div><div class="principle-grid">${CORE_PRINCIPLES.map(p=>`<div class="principle-card"><div class="principle-icon">${p.icon}</div><div><b>${p.title}</b><p>${compact?p.short:p.desc}</p></div></div>`).join('')}</div></section>`;
}

function renderHome(){
  if(!profileReady())return renderOnboard();
  const done=completedDays(),logs=state.logs,ready=blueprintReady(),started=!!state.journeyStartedAt,nextDay=started?Math.min(14,currentProgramDay()):1;
  const starter=starterDone();
  app.innerHTML=`<section class="card hero"><span class="pill">${ready?'Blueprint aktif':started?'Perjalanan berjalan':'Siap membangun sistem'}</span><h1>Halo, ${esc(state.profile.caregiver)} 👋</h1><p class="sub">${ready?'Blueprint keluarga sudah aktif. Sekarang fokusnya adalah review mingguan dan penyesuaian kecil.':'Produk ini membantu keluarga menguji apa yang cocok—bukan sekadar menghitung menit layar.'}</p><div class="row"><button class="primary" onclick="nav('${ready?'blueprint':started?'journey':starter?'checkup':'starter'}')">${ready?'Lihat Blueprint':started?'Buka Hari '+nextDay:starter?'Buka Family Digital Plan':'Mulai Starter Lab'}</button><button class="ghost ai-visible" onclick="nav('coach')">✨ Tanya AI Family Coach</button></div></section>
  ${!starter?`<section class="card next-step" style="margin-top:16px"><div class="label">Langkah 1</div><h2>Parenting Starter Lab • ±5–7 menit</h2><p>Latihan skenario singkat tentang ekspektasi usia, disiplin, komunikasi, teknologi, keteladanan, eksplorasi, dan rasa mampu.</p><button class="primary" onclick="nav('starter')">Mulai microlearning →</button></section>`:''}
  ${starter&&!state.checkup?.priorityGoal&&!state.checkup?.goal?`<section class="card next-step" style="margin-top:16px"><div class="label">Langkah 2</div><h2>Petakan semua masalah dan tujuan keluarga</h2><p>Check-Up sekarang bisa mencatat lebih dari satu masalah dan lebih dari satu tujuan, lalu memilih satu prioritas minggu ini.</p><button class="primary" onclick="nav('checkup')">Isi Digital Check-Up →</button></section>`:''}
  ${started?`<div class="grid three" style="margin-top:16px"><div class="card"><div class="label">Progress Blueprint</div><div class="metric">${done}/14</div></div><div class="card"><div class="label">Sesi tercatat</div><div class="metric">${logs.length}</div><div class="small">pagi/siang/sore/malam boleh lebih dari satu</div></div><div class="card"><div class="label">Tontonan tersimpan</div><div class="metric">${state.savedWatch.length}</div></div></div>`:''}
  ${practiceSpotlight()}
  ${started?`<section class="card" style="margin-top:16px"><div class="row space"><div><div class="label">Aksi cepat</div><h2>Apa yang kamu butuhkan sekarang?</h2></div></div><div class="quick-actions"><button class="ghost" onclick="nav('today')">⏱️ Rencanakan sesi + timer</button><button class="ghost" onclick="nav('watch')">▶️ Cari tontonan Indonesia</button><button class="ghost" onclick="nav('after')">🌱 Pilih aktivitas setelah layar</button><button class="ghost" onclick="nav('log')">📝 Catat sesi</button><button class="ghost ai-visible" onclick="nav('coach')">✨ Buka AI Coach</button></div></section>${patternHTML(true)}`:''}`;
}


function renderOnboard(){
  app.innerHTML=`<section class="card hero"><span class="device-badge">Core v4 • mulai singkat</span><h1>Bangun rutinitas digital keluarga yang benar-benar sesuai kondisi rumah</h1><p class="sub">Mulai dengan microlearning interaktif, petakan beberapa masalah sekaligus, lalu uji satu fokus melalui perjalanan 14 hari.</p><div class="onboard-flow"><div><b>1</b><span>Parenting Starter Lab</span></div><div><b>2</b><span>Multi-problem Digital Check-Up</span></div><div><b>3</b><span>14 hari uji rutinitas</span></div><div><b>4</b><span>Blueprint + Maintenance</span></div></div><div class="local-note"><b>Privasi:</b> data inti tersimpan di browser/perangkat ini. AI hanya menerima konteks jika Anda memilih membawanya ke Gemini atau ChatGPT.</div><form onsubmit="event.preventDefault();setProfile(this)"><div class="grid two"><div><label>Nama/panggilan anak</label><input name="name" required placeholder="Contoh: Mahir"></div><div><label>Usia anak</label><select name="age" required>${[3,4,5,6,7,8,9,10].map(x=>`<option value="${x}">${x} tahun</option>`).join('')}</select></div></div><label>Panggilan caregiver <span class="optional">(opsional)</span></label><input name="caregiver" placeholder="Umi / Mama / Ayah"><label class="checkline" style="margin-top:14px"><input type="checkbox" required><span>Saya memahami data disimpan di browser/perangkat ini.</span></label><br><button class="primary">Mulai Parenting Starter Lab →</button></form></section>`;
}
function renderCheckup(){
  if(!profileReady())return renderOnboard();
  const c=state.checkup||{},sg=selectedGoals(),sm=selectedMoments(),otherMoment=sm.find(m=>!MOMENT_OPTIONS.includes(m))||'';
  app.innerHTML=`<div class="row space"><div><h1>Family Digital Check-Up</h1><p class="sub">Masalah boleh lebih dari satu. Tujuan juga boleh lebih dari satu. Sistem hanya meminta satu prioritas agar perubahan tetap realistis.</p></div>${(c.priorityGoal||c.goal)?'<span class="pill ok">Plan tersimpan</span>':''}</div>
  <form class="card" onsubmit="event.preventDefault();saveCheckup(this)">
  <div class="grid two"><div><label>Rata-rata screen time hiburan saat ini <span class="optional">(menit/hari)</span></label><input type="number" name="baseline" min="0" value="${c.baseline||''}" placeholder="Contoh: 120"></div><div><label>Target keluarga saat ini <span class="optional">(opsional)</span></label><input type="number" name="target" min="0" value="${c.target||''}" placeholder="Boleh dikosongkan"></div></div>
  <label style="margin-top:16px">Apa saja tujuan keluarga? <span class="optional">boleh pilih beberapa</span></label>
  ${checkboxGrid('goals',GOAL_OPTIONS,sg)}
  <label style="margin-top:16px">Kalau harus mulai dari satu dulu, fokus minggu ini apa?</label><select name="priorityGoal">${GOAL_OPTIONS.map(([v,l])=>`<option value="${v}" ${(c.priorityGoal||c.goal||sg[0])===v?'selected':''}>${esc(l)}</option>`).join('')}</select>
  <label style="margin-top:16px">Kapan masalah layar biasanya muncul? <span class="optional">boleh pilih beberapa</span></label>
  ${momentGrid(sm)}
  <label>Ada momen lain?</label><input name="hardOther" value="${esc(otherMoment)}" placeholder="Contoh: saat perjalanan jauh, ketika ada tamu...">
  <div class="grid two"><div><label>Waktu Bebas Layar Pertama yang paling realistis</label><select name="anchor"><option ${c.anchor==='Meja makan'?'selected':''}>Meja makan</option><option ${c.anchor==='30-60 menit sebelum tidur'?'selected':''}>30-60 menit sebelum tidur</option><option ${c.anchor==='Waktu ibadah/kebersamaan'?'selected':''}>Waktu ibadah/kebersamaan</option><option ${c.anchor==='Saat belajar/tugas'?'selected':''}>Saat belajar/tugas</option></select></div><div><label>Aktivitas offline yang biasanya disukai</label><input name="fav" value="${esc(c.fav||'')}" placeholder="Main bersama, menggambar, sepeda..."></div></div>
  <label>Kebiasaan HP orang tua saat bersama anak</label><select name="parentHabit"><option ${c.parentHabit==='Jarang'?'selected':''}>Jarang</option><option ${c.parentHabit==='Kadang'?'selected':''}>Kadang</option><option ${c.parentHabit==='Sering'?'selected':''}>Sering</option><option ${c.parentHabit==='Belum tahu'?'selected':''}>Belum tahu</option></select>
  <div class="notice" style="margin-top:14px"><b>Kenapa pilih satu prioritas?</b> Semua masalah tetap tersimpan. Satu prioritas hanya membantu keluarga menguji perubahan yang cukup kecil untuk diamati.</div>
  <div class="row" style="margin-top:16px"><button class="primary">${(c.priorityGoal||c.goal)?'Perbarui Family Digital Plan':'Simpan Family Digital Plan'}</button><button type="button" class="ghost" onclick="nav('home')">Kembali</button></div></form>`;
}
function formatDateID(iso){if(!iso)return '-';return new Date(iso).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});} function programEndDate(){if(!state.journeyStartedAt)return null;const d=new Date(state.journeyStartedAt);d.setDate(d.getDate()+13);return d.toISOString();}
function renderJourney(){if(!profileReady())return renderOnboard();const done=completedDays();if(!state.journeyStartedAt){app.innerHTML=`<section class="card hero"><span class="pill">14 hari → 1 output nyata</span><h1>Bangun Family Digital Blueprint</h1><p class="sub">Empat belas hari ini adalah fase uji keluarga. Tidak perlu mengubah semuanya sekaligus—cukup satu langkah kecil per hari.</p><div class="grid three"><div class="card"><h3>Hari 1–4</h3><p>Kenali pola & konteks.</p></div><div class="card"><h3>Hari 5–10</h3><p>Uji aturan, transisi, konten, dan aktivitas.</p></div><div class="card"><h3>Hari 11–14</h3><p>Pilih yang bekerja dan susun sistem keluarga.</p></div></div><div class="notice success" style="margin-top:16px"><b>Begitu tombol di bawah ditekan, Hari 1 langsung terbuka hari ini.</b> Hari berikutnya terbuka sesuai tanggal. Blueprint terbuka pada hari kalender ke-14 walaupun ada hari yang terlewat.</div><br><button class="primary big-cta" onclick="startJourney()">Mulai Hari 1 Sekarang →</button></section>`;return;}const cur=currentProgramDay();const ready=blueprintReady();app.innerHTML=`<div class="row space"><div><h1>14-Day Digital Reset</h1><p class="sub">Mulai ${formatDateID(state.journeyStartedAt)} • Blueprint terbuka ${formatDateID(programEndDate())}</p></div><span class="pill ok">${done}/14 tersimpan</span></div><div class="journey-status"><div><span class="label">Hari program</span><strong>${cur}</strong></div><div><span class="label">Hari yang bisa diisi</span><strong>1–${cur}</strong></div><div><span class="label">Blueprint</span><strong>${ready?'Terbuka':'Hari 14'}</strong></div></div><div class="notice ${ready?'success':''}" style="margin-bottom:14px">${ready?'<b>Fase 14 hari sudah selesai.</b> Semua hari kini terbuka dan Blueprint sudah aktif.':`<b>Hari ${cur} aktif.</b> Hari yang terlewat tetap bisa diisi. Hari berikutnya terbuka otomatis besok.`}</div><div class="grid">${D.journey.map(d=>{const unlocked=dayUnlocked(d[0]);const doneDay=!!state.days[d[0]];const note=state.journeyNotes[d[0]]||'';return `<div class="card day ${doneDay?'done':''} ${unlocked?'':'locked'}"><div class="daynum">${d[0]}</div><div><div class="row principle-day"><h3>${esc(d[1])}</h3><span class="principle-tag">${principleForDay(d[0]).icon} ${principleForDay(d[0]).title}</span></div><p>${esc(d[2])}</p><div class="quote"><b>Aksi:</b> ${esc(d[3])}</div><div class="small" style="margin-top:8px">Basis: ${esc(d[4])}</div>${unlocked?`<label style="margin-top:12px">Catatan untuk Blueprint</label><textarea id="daynote${d[0]}" placeholder="${esc(D.journeyPrompts[d[0]])}">${esc(note)}</textarea><div class="row"><button class="${doneDay?'ghost':'primary'}" onclick="saveDay(${d[0]})">${doneDay?'Perbarui catatan':'Simpan Hari '+d[0]}</button>${doneDay?'<span class="pill ok">✓ Tersimpan</span>':''}</div>`:`<div class="small lock-copy" style="margin-top:12px"><b>Terbuka pada Hari ${d[0]}.</b> Tidak perlu mengerjakannya sekarang.</div>`}</div><div>${doneDay?'✓':unlocked?'○':'🔒'}</div></div>`}).join('')}</div>${ready?'<section class="card hero" style="margin-top:16px"><h2>🎉 Family Digital Blueprint sudah terbuka</h2><p>Blueprint dibuat dari data yang sempat terkumpul. Jika ada hari yang terlewat, lengkapi kapan saja—Blueprint akan ikut diperbarui.</p><button class="primary" onclick="nav(\'blueprint\')">Lihat Family Digital Blueprint</button></section>':''}`;}

let timerInt=null,timerEnd=null,timerTotalMs=0,timerWarn5=false,timerWarn1=false,timerSoundEnabled=true;
function playTone(freq=660,duration=160,repeat=1){
  if(!timerSoundEnabled)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    const ctx=window.__gtdAudio||(window.__gtdAudio=new AC());
    if(ctx.state==='suspended')ctx.resume();
    for(let i=0;i<repeat;i++)setTimeout(()=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.22,ctx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration/1000);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration/1000+.03)},i*(duration+90));
  }catch(e){}
}
function testSound(){playTone(760,140,2);toast('🔊 Jika terdengar dua bunyi, audio timer aktif.')}
function toggleTimerSound(){timerSoundEnabled=!timerSoundEnabled;toast(timerSoundEnabled?'🔊 Bunyi timer aktif':'🔇 Bunyi timer dimatikan');renderToday();}
function startTimer(){
  const mins=+(document.getElementById('todayMins')?.value||0);if(!mins)return;
  timerTotalMs=mins*60000;timerEnd=Date.now()+timerTotalMs;timerWarn5=false;timerWarn1=false;
  clearInterval(timerInt);playTone(520,100,1);timerInt=setInterval(updateTimer,250);updateTimer();
}
function resetTimer(){clearInterval(timerInt);timerEnd=null;timerTotalMs=0;const el=document.getElementById('timer');if(el)el.textContent='--:--';}
function updateTimer(){
  const el=document.getElementById('timer');if(!el||!timerEnd)return;
  const left=Math.max(0,timerEnd-Date.now()),m=Math.floor(left/60000),s=Math.floor((left%60000)/1000);
  el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if(timerTotalMs>5*60000&&left<=5*60000&&!timerWarn5){timerWarn5=true;playTone(620,110,1);toast('⏳ 5 menit lagi. Mulai siapkan jembatan transisi.')}
  if(timerTotalMs>60000&&left<=60000&&!timerWarn1){timerWarn1=true;playTone(720,120,2);toast('⏳ 1 menit lagi. Pilih bagian terakhir.')}
  if(left<=0){clearInterval(timerInt);timerEnd=null;el.textContent='SELESAI';playTone(880,180,3);if(navigator.vibrate)navigator.vibrate([150,80,150]);toast('🔔 Waktu selesai. Lanjutkan ke aktivitas yang sudah dipilih.')}
}
function toggleWatch(id){const i=state.savedWatch.indexOf(id);if(i>=0)state.savedWatch.splice(i,1);else state.savedWatch.push(id);save();renderWatch();}
function toggleActivity(name){const i=state.savedActivities.indexOf(name);if(i>=0)state.savedActivities.splice(i,1);else state.savedActivities.push(name);save();renderAfterScreen(window.__afterMode||'quick');}
function activityVisual(a){
  const n=a[0],goal=a[5];
  if(n.includes('Warna')||n.includes('Jejak'))return `<svg class="activity-art" viewBox="0 0 320 150" role="img" aria-label="Ilustrasi berburu warna"><rect width="320" height="150" rx="18" fill="#fff7ed"/><circle cx="58" cy="67" r="25" fill="#ef4444"/><rect x="105" y="42" width="48" height="48" rx="8" fill="#f59e0b"/><path d="M190 90 L215 40 L240 90 Z" fill="#10b981"/><rect x="258" y="55" width="28" height="55" rx="8" fill="#3b82f6"/><text x="24" y="132" font-size="16" font-family="Arial" fill="#374151">Cari • tunjuk • hitung</text></svg>`;
  if(n.includes('Emosi')||goal==='Sosial-emosional')return `<svg class="activity-art" viewBox="0 0 320 150" role="img" aria-label="Ilustrasi wajah emosi"><rect width="320" height="150" rx="18" fill="#fdf2f8"/><circle cx="82" cy="72" r="42" fill="#fde68a"/><circle cx="70" cy="63" r="4"/><circle cx="94" cy="63" r="4"/><path d="M65 84 Q82 98 100 84" fill="none" stroke="#374151" stroke-width="4"/><circle cx="220" cy="72" r="42" fill="#bfdbfe"/><circle cx="208" cy="63" r="4"/><circle cx="232" cy="63" r="4"/><path d="M204 94 Q220 80 238 94" fill="none" stroke="#374151" stroke-width="4"/><text x="26" y="132" font-size="16" font-family="Arial" fill="#374151">Kenali • tirukan • ceritakan</text></svg>`;
  if(n.includes('Siram')||n.includes('Tanaman'))return `<svg class="activity-art" viewBox="0 0 320 150" role="img" aria-label="Ilustrasi menyiram tanaman"><rect width="320" height="150" rx="18" fill="#ecfdf5"/><rect x="205" y="85" width="55" height="35" rx="5" fill="#b45309"/><path d="M232 86 C220 55 188 48 180 70 C199 76 220 74 232 86Z" fill="#22c55e"/><path d="M232 86 C246 50 276 48 284 70 C264 76 245 73 232 86Z" fill="#16a34a"/><path d="M72 80 h70 v35 h-70z" fill="#60a5fa"/><path d="M142 85 q38 8 50 28" fill="none" stroke="#60a5fa" stroke-width="8"/><circle cx="198" cy="116" r="4" fill="#3b82f6"/><circle cx="212" cy="123" r="4" fill="#3b82f6"/><text x="24" y="132" font-size="16" font-family="Arial" fill="#374151">Siram • amati • ceritakan</text></svg>`;
  if(n.includes('Toko')||n.includes('Piknik'))return `<svg class="activity-art" viewBox="0 0 320 150" role="img" aria-label="Ilustrasi bermain pura-pura"><rect width="320" height="150" rx="18" fill="#f5f3ff"/><rect x="65" y="46" width="190" height="70" rx="10" fill="#fff" stroke="#a78bfa" stroke-width="4"/><rect x="90" y="70" width="38" height="28" rx="4" fill="#fca5a5"/><rect x="142" y="62" width="38" height="36" rx="4" fill="#86efac"/><circle cx="215" cy="80" r="19" fill="#fde68a"/><text x="24" y="132" font-size="16" font-family="Arial" fill="#374151">Pilih peran • bicara • bergiliran</text></svg>`;
  if(goal==='Kemandirian'||n.includes('Rapikan')||n.includes('Bantu'))return `<svg class="activity-art" viewBox="0 0 320 150" role="img" aria-label="Ilustrasi tugas rumah sederhana"><rect width="320" height="150" rx="18" fill="#eff6ff"/><rect x="65" y="75" width="190" height="18" rx="9" fill="#94a3b8"/><rect x="95" y="47" width="35" height="25" rx="5" fill="#fbbf24"/><circle cx="172" cy="59" r="13" fill="#fb7185"/><rect x="205" y="44" width="28" height="28" rx="4" fill="#34d399"/><path d="M245 100 q20 5 30 25" stroke="#2563eb" stroke-width="8" fill="none"/><text x="24" y="132" font-size="16" font-family="Arial" fill="#374151">Pilih zona kecil • rapikan bersama</text></svg>`;
  if(goal==='Sains'||n.includes('Eksperimen'))return `<svg class="activity-art" viewBox="0 0 320 150" role="img" aria-label="Ilustrasi eksperimen sederhana"><rect width="320" height="150" rx="18" fill="#ecfeff"/><path d="M115 35 v42 l-26 42 h72 l-26-42 V35z" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/><circle cx="122" cy="95" r="8" fill="#f97316"/><circle cx="145" cy="102" r="6" fill="#22c55e"/><rect x="205" y="63" width="60" height="48" rx="8" fill="#fff" stroke="#06b6d4" stroke-width="4"/><text x="24" y="132" font-size="16" font-family="Arial" fill="#374151">Prediksi • coba • bandingkan</text></svg>`;
  return `<svg class="activity-art" viewBox="0 0 320 150" role="img" aria-label="Ilustrasi aktivitas anak"><rect width="320" height="150" rx="18" fill="#f8fafc"/><circle cx="85" cy="72" r="30" fill="#c4b5fd"/><rect x="135" y="46" width="58" height="58" rx="12" fill="#93c5fd"/><path d="M235 105 L265 45 L295 105 Z" fill="#86efac"/><text x="24" y="132" font-size="16" font-family="Arial" fill="#374151">Lihat • lakukan • ceritakan</text></svg>`;
}
function activityGuide(a){
  const n=a[0];
  const exact={
    'Cari 5 Benda Warna Sama':{why:'Melatih observasi, perpindahan dari layar ke lingkungan nyata, dan berhitung sederhana.',say:'“Tadi baru ketemu tiga. Kamu lihat ke rak lagi dan akhirnya ketemu lima. Yuk kita hitung: satu, dua, tiga, empat, lima.”'},
    'Jejak Warna dan Bentuk':{why:'Membantu anak memperhatikan lingkungan dengan kategori sederhana.',say:'“Kamu tadi menemukan lingkaran di jam dan piring. Kamu pakai cara yang sama untuk mencari bentuk lain.”'},
    'Buat Wajah Emosi':{why:'Membantu memberi nama pada perasaan melalui permainan, bukan interogasi.',say:'“Kamu membuat alisnya turun supaya terlihat marah. Kamu memperhatikan bagian wajah yang berubah.”'},
    'Detektif Emosi':{why:'Menghubungkan ekspresi, kosakata emosi, dan cerita sederhana.',say:'“Kamu melihat matanya dan mulutnya dulu sebelum menebak perasaannya.”'},
    'Misi Siram Tanaman':{why:'Memberi transisi fisik yang pelan sekaligus tanggung jawab kecil.',say:'“Kamu menuang air pelan supaya tidak tumpah. Tanamannya sudah selesai kamu bantu.”'},
    'Toko-tokoan Mini':{why:'Mengubah waktu setelah layar menjadi percakapan, pilihan, dan imajinasi.',say:'“Tadi kamu memilih jadi penjual dan ingat menunggu giliran waktu aku bicara.”'},
    'Misi Rapikan Meja':{why:'Memberi tugas nyata yang kecil dan terlihat selesai.',say:'“Kamu memisahkan mana yang dibuang dan mana yang disimpan. Meja jadi lebih kosong karena strategimu.”'},
    'Eksperimen Tenggelam-Mengapung':{why:'Melatih prediksi, uji sederhana, dan menerima hasil yang berbeda dari tebakan.',say:'“Tebakanmu tadi berbeda dari hasilnya, lalu kamu mencoba benda lain. Sekarang kita punya dua hasil untuk dibandingkan.”'},
    'Bantu Tugas Rumah Sesuai Usia':{why:'Membantu anak merasa menjadi bagian dari aktivitas keluarga.',say:'“Kamu memilih tugas menyusun sepatu dan menyelesaikan rak bagian bawah. Itu benar-benar membantu.”'}
  };
  return exact[n]||{why:'Menjembatani layar ke aktivitas nyata yang singkat dan sesuai usia.',say:'Sebutkan satu hal spesifik yang anak lakukan: usaha, strategi, pilihan, atau kontribusinya. Contoh: “Aku lihat kamu mencoba, berhenti sebentar, lalu memilih cara lain.”'};
}
let __afterMode='quick';
function setAfterMode(mode){window.__afterMode=mode;renderAfterScreen(mode);}
function activityCard(a){
  const saved=state.savedActivities.includes(a[0]),g=activityGuide(a);
  return `<article class="card activity-card">${activityVisual(a)}<div class="row space"><h3>${esc(a[0])}</h3><span class="pill">${esc(a[2])} mnt</span></div><p>${esc(a[6])}</p><div class="small">Usia ${esc(a[1])} • ${esc(a[3])} • ${esc(a[5])}</div><div class="activity-why"><b>Kenapa aktivitas ini?</b><br>${esc(g.why)}</div><div class="process-praise"><b>Contoh respons orang tua:</b><br>“${esc(g.say.replace(/^“|”$/g,''))}”</div><button class="ghost" style="margin-top:10px" onclick="toggleActivity('${String(a[0]).replace(/'/g,"\\'")}')">${saved?'✓ Tersimpan':'♡ Simpan ke Blueprint'}</button></article>`;
}
function saveCapacity(level){
  state.parentChecks=state.parentChecks||[];
  state.parentChecks.unshift({date:new Date().toISOString(),level});state.parentChecks=state.parentChecks.slice(0,30);save();renderToday();setTimeout(()=>toast('✓ Kapasitas orang tua dicatat. Gunakan ini untuk menyederhanakan rencana, bukan menilai diri.'),0);
}
function capacityGuidance(level){
  return {Penuh:'Boleh jalankan rencana seperti biasa. Tetap pilih batas yang singkat dan jelas.',Cukup:'Pertahankan satu prioritas. Tidak perlu menambah aturan baru hari ini.',Tipis:'Pilih aktivitas setelah layar yang paling mudah. Kurangi negosiasi dan proyek besar.',Habis:'Sederhanakan target hari ini. Fokus keselamatan, kebutuhan dasar, dan satu batas inti; pembahasan panjang bisa menunggu.'}[level]||'Pilih kondisi yang paling mendekati hari ini.';
}
function renderToday(){
  if(!profileReady())return renderOnboard();
  const c=state.checkup,age=state.profile.age;
  const picks=D.watch.filter(w=>w.language==='Bahasa Indonesia'&&age>=w.age_min&&age<=w.age_max).slice(0,3);
  const acts=D.activities.filter(a=>{const [lo,hi]=a[1].split('-').map(Number);return age>=lo&&age<=hi}).slice(0,3);
  app.innerHTML=`<div class="grid two"><section class="card hero"><div class="row space"><div><span class="pill">Timer bersuara</span><h1>Today Mode</h1></div><button class="ghost" onclick="testSound()">🔊 Tes bunyi</button></div><p class="sub">Rencanakan satu sesi. Warning 5 menit dan 1 menit berbunyi otomatis jika durasi memungkinkan.</p><label>Durasi sesi (menit)</label><input id="todayMins" type="number" value="${c.target||30}" min="1"><div class="row" style="margin-top:12px"><button class="primary" onclick="startTimer()">Mulai Timer</button><button class="ghost" onclick="resetTimer()">Reset</button><button class="ghost" onclick="toggleTimerSound()">${timerSoundEnabled?'🔊 Suara aktif':'🔇 Suara mati'}</button></div><div class="timer" id="timer">--:--</div><div class="small">Biarkan browser tetap terbuka agar timer dan bunyi berjalan konsisten.</div></section><section class="card"><h2>Siapkan transisi sebelum layar menyala</h2><div class="quote"><b>🧭 Batas:</b> “Kita pakai sampai timer selesai. Setelah itu kamu pilih [aktivitas A] atau [aktivitas B].”</div><div class="quote" style="margin-top:10px"><b>🌉 Jembatan:</b> “Sebentar lagi selesai. Pilih bagian terakhir, lalu kita lanjut ke kegiatan yang sudah disiapkan.”</div><div class="row" style="margin-top:14px"><button class="primary" onclick="openAI('transition','gemini')">✨ Tanya Gemini kalau transisi sulit</button><button class="ghost" onclick="openAI('transition','chatgpt')">Tanya ChatGPT</button></div></section></div><section class="card capacity-card" style="margin-top:16px"><div class="row space"><div><div class="label">Parent Capacity Check • 30 detik</div><h2>Energi orang tua sekarang bagaimana?</h2></div><span class="pill gray">bukan screening klinis</span></div><p class="sub">Saat kapasitas sedang tipis, sistem sebaiknya menyederhanakan tuntutan—bukan menambah rasa bersalah.</p><div class="capacity-buttons">${['Penuh','Cukup','Tipis','Habis'].map(v=>`<button class="${state.parentChecks?.[0]?.level===v?'active':''}" onclick="saveCapacity('${v}')">${v}</button>`).join('')}</div><div class="capacity-guidance">${esc(capacityGuidance(state.parentChecks?.[0]?.level))}</div></section><h2 style="margin-top:20px">Tontonan Bahasa Indonesia untuk usia ${age}</h2><div class="grid three">${picks.length?picks.map(w=>watchCard(w,false)).join(''):'<div class="card empty" style="grid-column:1/-1">Belum ada pilihan Indonesia untuk usia ini.</div>'}</div><div class="row space" style="margin-top:20px"><h2>Siapkan aktivitas sesudah layar</h2><button class="ghost" onclick="nav('after')">Lihat semua aktivitas →</button></div><div class="grid three">${acts.map(a=>activityCard(a)).join('')}</div>`;
}


function watchCard(w,showSave=true){
  const saved=state.savedWatch.includes(w.id),dur=w.minutes?`${w.minutes} mnt`:'cek durasi di YouTube';
  return `<div class="card watch-card"><div class="row space"><span class="pill">🇮🇩 Bahasa Indonesia</span><span class="pill gray">${esc(w.status||'Ditinjau')}</span></div><h3 style="margin-top:10px">${esc(w.title)}</h3><div class="meta"><span class="pill gray">${w.age_min}-${w.age_max} th</span><span class="pill gray">${esc(dur)}</span>${w.themes.map(t=>`<span class="pill gray">${esc(t)}</span>`).join('')}</div><p>${esc(w.why)}</p><div class="quote"><b>💬 Talk:</b> ${esc(w.talk[0]||'Apa yang paling kamu ingat?')}<br><b>🌉 Do:</b> ${esc(w.do)}<br><b>🔎 Explore:</b> “Apa yang kamu perhatikan setelah mencobanya?”</div><div class="small" style="margin-top:8px">Channel: ${esc(w.channel)} • link watch page langsung</div><div class="row" style="margin-top:10px"><a target="_blank" rel="noopener" href="${w.url}">Putar di YouTube ↗</a>${showSave?`<button class="ghost" onclick="toggleWatch('${w.id}')">${saved?'✓ Tersimpan':'♡ Simpan'}</button>`:''}</div></div>`;
}
function renderWatch(){
  if(!profileReady())return renderOnboard();
  const age=state.profile.age,themes=['Semua','Sains & Alam','Sosial-emosional & Karakter','Literasi & Bahasa','Numerasi & Logika','Kebiasaan & Life Skills','Kreativitas & Problem Solving','Nilai & Adab'];
  const idWatch=D.watch.filter(w=>w.language==='Bahasa Indonesia'),ageCount=idWatch.filter(w=>age>=w.age_min&&age<=w.age_max).length;
  app.innerHTML=`<div class="row space"><div><span class="pill ok">MVP Indonesia</span><h1>Boleh Nonton Apa?</h1><p class="sub">Untuk versi ini, library yang ditampilkan khusus Bahasa Indonesia. English disimpan untuk fase berikutnya.</p></div><span class="pill">${idWatch.length} pilihan Indonesia</span></div><div class="curation-summary"><div><b>${ageCount}</b><span>cocok untuk usia ${age} tahun</span></div><div><b>🇮🇩</b><span>Bahasa Indonesia dulu</span></div><div><b>↗</b><span>watch page YouTube langsung</span></div></div><div class="notice"><b>Untuk anak 3 tahun:</b> library sekarang sudah memiliki pilihan PAUD Bahasa Indonesia. Orang tua tetap disarankan preview singkat karena isi/platform dapat berubah.</div><div class="filters filters-3" style="margin-top:14px"><select id="fTheme" onchange="filterWatch()">${themes.map(x=>`<option>${x}</option>`).join('')}</select><select id="fAge" onchange="filterWatch()"><option value="profile">Untuk usia ${age} tahun</option><option value="all">Semua usia 3–10</option></select><input id="fSearch" oninput="filterWatch()" placeholder="Cari judul, channel, tema..."></div><div class="row space watch-result-row"><span id="watchCount" class="small"></span><button class="ghost compact" onclick="resetWatchFilters()">Reset filter</button></div><div id="watchGrid" class="grid two"></div>`;filterWatch();
}
function filterWatch(){
  const theme=document.getElementById('fTheme')?.value||'Semua',ag=document.getElementById('fAge')?.value||'profile',q=(document.getElementById('fSearch')?.value||'').toLowerCase(),age=state.profile.age;
  const items=D.watch.filter(w=>w.language==='Bahasa Indonesia'&&(theme==='Semua'||w.themes.includes(theme))&&(ag==='all'||(age>=w.age_min&&age<=w.age_max))&&(!q||[w.title,w.channel,...w.themes].join(' ').toLowerCase().includes(q)));
  const count=document.getElementById('watchCount');if(count)count.textContent=`${items.length} pilihan`;
  document.getElementById('watchGrid').innerHTML=items.length?items.map(w=>watchCard(w,true)).join(''):`<div class="card empty" style="grid-column:1/-1"><h3>Belum ada pilihan Indonesia yang cocok dengan filter ini.</h3><p>Coba ubah usia/tema atau hapus kata pencarian.</p><button class="primary" onclick="resetWatchFilters()">Tampilkan semua Indonesia</button></div>`;
}
function resetWatchFilters(){const t=document.getElementById('fTheme'),a=document.getElementById('fAge'),q=document.getElementById('fSearch');if(t)t.value='Semua';if(a)a.value='all';if(q)q.value='';filterWatch();}
function renderAfterScreen(mode='quick'){
  if(!profileReady())return renderOnboard();window.__afterMode=mode;
  const age=state.profile.age,acts=D.activities.filter(a=>{const [lo,hi]=a[1].split('-').map(Number);return age>=lo&&age<=hi});
  const selected=state.savedWatch.map(id=>D.watch.find(w=>w.id===id)).filter(w=>w&&w.language==='Bahasa Indonesia');
  const watch=selected[0]||D.watch.find(w=>w.language==='Bahasa Indonesia'&&age>=w.age_min&&age<=w.age_max);
  const tabs=`<div class="mode-tabs"><button class="${mode==='quick'?'active':''}" onclick="setAfterMode('quick')">⚡ Aktivitas Cepat</button><button class="${mode==='mission'?'active':''}" onclick="setAfterMode('mission')">🎯 Misi dari Tontonan</button></div>`;
  if(mode==='mission'){
    app.innerHTML=`<div class="row space"><div><h1>Setelah Layar</h1><p class="sub">Mode Misi menghubungkan video yang baru ditonton ke percakapan dan pengalaman nyata.</p></div></div>${tabs}${watch?`<section class="card hero"><div class="label">Tontonan pemicu</div><h2>${esc(watch.title)}</h2><div class="explore-steps"><div><b>1. Watch</b><span>Tonton dengan tujuan yang jelas.</span></div><div><b>2. Talk</b><span>${esc(watch.talk[0]||'Apa yang kamu ingat?')}</span></div><div><b>3. Do</b><span>${esc(watch.do)}</span></div><div><b>4. Explore</b><span>Tanya apa yang anak perhatikan dan biarkan mencoba variasi yang aman.</span></div></div></section>`:'<section class="card">Simpan satu video Indonesia dulu di Boleh Nonton Apa?</section>'}<section class="card" style="margin-top:16px"><h2>Aktivitas yang bisa dipilih sesudahnya</h2><div class="grid two">${acts.slice(0,6).map(a=>activityCard(a)).join('')}</div></section>`;
  }else{
    app.innerHTML=`<div class="row space"><div><h1>Setelah Layar</h1><p class="sub">Satu menu, dua kebutuhan: aktivitas cepat saat butuh ide sekarang, atau misi yang berasal dari tontonan.</p></div><span class="pill">${state.savedActivities.length} tersimpan</span></div>${tabs}<div class="notice" style="margin-bottom:14px"><b>Gambar membantu scan cepat.</b> Setiap kartu juga memberi contoh kalimat orang tua yang spesifik untuk aktivitas tersebut.</div><div class="grid two">${acts.map(a=>activityCard(a)).join('')}</div>`;
  }
}
function renderActivity(){renderAfterScreen('quick')}

function periodFromTime(t){
  if(!t)return '';
  const h=parseInt(t.split(':')[0],10);
  if(h<11)return 'Pagi'; if(h<15)return 'Siang'; if(h<18)return 'Sore'; return 'Malam';
}
function addLog(form){
  const fd=new FormData(form),time=String(fd.get('time')||''),period=periodFromTime(time)||'Tidak tercatat';
  state.logs.unshift({
    date:new Date().toISOString().slice(0,10),time,period,
    planned:+fd.get('planned')||0,actual:+fd.get('actual')||0,
    content:String(fd.get('content')||''),warning:String(fd.get('warning')||''),
    conflict:String(fd.get('conflict')||''),after:String(fd.get('after')||''),
    note:String(fd.get('note')||'')
  });
  save();renderLog();setTimeout(()=>toast('✓ Sesi tersimpan. Kalau hari ini ada sesi lain, tambahkan lagi.'),0);
}
function pattern(){
  if(!state.logs.length)return null;
  const logs=state.logs;
  const avgAct=Math.round(logs.reduce((s,l)=>s+(+l.actual||0),0)/logs.length);
  const avgPlan=Math.round(logs.reduce((s,l)=>s+(+l.planned||0),0)/logs.length);
  const conflicts={};
  logs.filter(l=>l.conflict&&l.conflict!=='Tidak').forEach(l=>conflicts[l.period||'Tidak tercatat']=(conflicts[l.period||'Tidak tercatat']||0)+1);
  const risk=Object.entries(conflicts).sort((a,b)=>b[1]-a[1])[0];
  const acts={};logs.filter(l=>l.after).forEach(l=>acts[l.after]=(acts[l.after]||0)+1);
  const fav=Object.entries(acts).sort((a,b)=>b[1]-a[1])[0];
  const warns=logs.filter(l=>l.warning==='Ya'),noWarn=logs.filter(l=>l.warning==='Tidak');
  return {avgAct,avgPlan,risk:risk&&risk[0],fav:fav&&fav[0],warns:warns.length,warnConflict:warns.filter(l=>l.conflict!=='Tidak').length,noWarn:noWarn.length,noWarnConflict:noWarn.filter(l=>l.conflict!=='Tidak').length};
}
function patternHTML(compact=false){
  const p=pattern();
  if(!p)return '<section class="card" '+(compact?'style="margin-top:16px"':'')+'><h2>Pola Keluarga</h2><p class="sub">Belum cukup catatan. Catat setiap sesi secara terpisah agar pola waktu dan transisi bisa terlihat.</p></section>';
  const rows=[
    'Rata-rata aktual '+p.avgAct+' menit dibanding rencana '+p.avgPlan+' menit.',
    p.risk?'Waktu konflik paling sering pada catatan saat ini: '+p.risk+'.':null,
    p.fav?'Aktivitas setelah layar yang paling sering dicatat: '+p.fav+'.':null,
    p.warns?'Dengan warning: '+p.warnConflict+' konflik dari '+p.warns+' sesi.':null,
    p.noWarn?'Tanpa warning: '+p.noWarnConflict+' konflik dari '+p.noWarn+' sesi.':null
  ].filter(Boolean);
  return '<section class="card" '+(compact?'style="margin-top:16px"':'')+'><div class="row space"><h2>Pola yang terlihat</h2><button class="ghost ai-visible" onclick="openAI(\'review\',\'gemini\')">✨ Baca pola dengan AI</button></div>'+rows.map(r=>'<div class="stat" style="margin-top:8px">'+esc(r)+'</div>').join('')+'<div class="small" style="margin-top:10px">Deskriptif berdasarkan catatan keluarga; tidak membuktikan sebab-akibat.</div></section>';
}
function todaySessionSummary(){
  const date=new Date().toISOString().slice(0,10),ls=state.logs.filter(l=>l.date===date);
  return {ls,total:ls.reduce((s,l)=>s+(+l.actual||0),0),warn:ls.filter(l=>l.warning==='Ya').length,conf:ls.filter(l=>l.conflict&&l.conflict!=='Tidak').length};
}
function renderLog(){
  if(!profileReady())return renderOnboard();
  const c=state.checkup||{},sum=todaySessionSummary();
  app.innerHTML=`<div class="row space"><div><h1>Daily Check-In</h1><p class="sub">Satu hari boleh punya beberapa sesi. Simpan tiap sesi terpisah agar pagi, siang, sore, dan malam tidak tercampur.</p></div><button class="ghost ai-visible" onclick="openAI('review','gemini')">✨ Analisis dengan AI</button></div>
  <div class="grid two"><form class="card" onsubmit="event.preventDefault();addLog(this)"><h2>+ Tambah sesi hari ini</h2><div class="grid two"><div><label>Jam mulai</label><input name="time" type="time" required></div><div><label>Rencana (menit)</label><input name="planned" type="number" value="${c.target||''}"></div><div><label>Aktual (menit)</label><input name="actual" type="number" required></div><div><label>Ada warning?</label><select name="warning"><option>Ya</option><option>Tidak</option></select></div><div><label>Ada konflik/protes?</label><select name="conflict"><option>Tidak</option><option>Ringan</option><option>Besar</option></select></div><div><label>Konten</label><input name="content" placeholder="Nama video/game"></div></div><label>Aktivitas setelah layar</label><input name="after" placeholder="Contoh: cari warna, siram tanaman"><label>Catatan singkat</label><textarea name="note" placeholder="Apa yang bekerja / tidak bekerja?"></textarea><button class="primary">Simpan Sesi</button></form>
  <section class="card daily-summary"><div class="label">Ringkasan hari ini</div><div class="session-metrics"><div><b>${sum.ls.length}</b><span>sesi</span></div><div><b>${sum.total}</b><span>menit total</span></div><div><b>${sum.warn}</b><span>pakai warning</span></div><div><b>${sum.conf}</b><span>ada konflik</span></div></div><p class="small">Kalau anak menonton pagi, siang, dan malam, simpan tiga sesi. Jangan digabung menjadi satu.</p>${sum.ls.length?'<div class="session-list">'+sum.ls.map(l=>'<div><b>'+esc(l.time||l.period)+'</b><span>'+esc(l.period)+' • '+l.actual+' mnt • konflik '+esc(l.conflict)+'</span></div>').join('')+'</div>':''}</section></div>
  ${patternHTML()}
  <section class="card" style="margin-top:16px"><h2>Riwayat sesi</h2>${state.logs.length?`<table><thead><tr><th>Tanggal/Jam</th><th>Rencana/Aktual</th><th>Waktu</th><th>Warning</th><th>Konflik</th><th>Sesudah</th></tr></thead><tbody>${state.logs.map(l=>`<tr><td>${esc(l.date)} ${esc(l.time||'')}</td><td>${l.planned}/${l.actual} mnt</td><td>${esc(l.period)}</td><td>${esc(l.warning)}</td><td>${esc(l.conflict)}</td><td>${esc(l.after)}</td></tr>`).join('')}</tbody></table>`:'<p class="small">Belum ada sesi.</p>'}</section>`;
}

function blueprintData(){
  const p=pattern();
  const savedW=state.savedWatch.map(id=>D.watch.find(w=>w.id===id)).filter(Boolean);
  const logActs={};state.logs.filter(l=>l.after).forEach(l=>logActs[l.after]=(logActs[l.after]||0)+1);
  const topLogActs=Object.entries(logActs).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
  return {p,savedW,acts:[...new Set([...state.savedActivities,...topLogActs])].slice(0,10)};
}
function renderBlueprint(){
  if(!profileReady())return renderOnboard();
  if(!blueprintReady()){
    app.innerHTML=`<section class="card hero"><span class="pill warn">Sedang dibangun</span><h1>Family Digital Blueprint</h1><p class="sub">Blueprint terbuka pada hari kalender ke-14 dan terus diperbarui setelahnya.</p><div class="grid two"><div class="card"><h3>Nanti berisi</h3><p>Prioritas keluarga • seluruh masalah yang dipetakan • pola per sesi • strategi transisi • tontonan Indonesia • aktivitas favorit • parent habit • rencana berikutnya.</p></div><div class="card"><h3>Catatan 14 hari</h3><div class="metric">${completedDays()}/14</div><div class="progress"><div style="width:${completedDays()/14*100}%"></div></div></div></div><br><button class="primary" onclick="nav('journey')">Lanjutkan 14 Hari</button></section>`;return;
  }
  const {p,savedW,acts}=blueprintData(),rules=(state.journeyNotes[13]||'').split(/\n|;/).filter(Boolean).slice(0,5),next=state.journeyNotes[14]||'Pertahankan satu eksperimen yang realistis dan review setiap minggu.';
  app.innerHTML=`<div class="row space"><div><span class="pill ok">Blueprint aktif</span><h1>Family Digital Blueprint</h1><p class="sub">Bukan rangkuman mati. Blueprint berubah saat Check-Up, log sesi, dan review mingguan berubah.</p></div><button class="primary" onclick="printBlueprint()">Unduh Blueprint PDF</button></div>
  <div class="grid two"><section class="card"><h2>1. Fokus keluarga</h2><p><b>${esc(state.profile.name)}</b> • ${state.profile.age} tahun</p><p>${esc(makePlan())}</p></section><section class="card"><h2>2. Masalah yang dipetakan</h2><div class="row">${selectedMoments().map(m=>`<span class="pill gray">${esc(m)}</span>`).join('')||'<span class="small">Belum dipilih</span>'}</div><h3 style="margin-top:12px">Tujuan</h3><div class="row">${selectedGoals().map(g=>`<span class="pill gray">${esc(goalLabel(g))}</span>`).join('')}</div></section></div>
  <div class="grid two" style="margin-top:16px"><section class="card"><h2>3. Pola sesi</h2>${p?`<p>Rata-rata aktual <b>${p.avgAct} menit</b>; rencana ${p.avgPlan} menit.</p>${p.risk?`<p>Waktu konflik paling sering: <b>${esc(p.risk)}</b>.</p>`:''}`:'<p>Belum cukup log.</p>'}<div class="small">Deskriptif, bukan diagnosis.</div></section><section class="card"><h2>4. Strategi transisi</h2><p>${esc(state.journeyNotes[6]||state.journeyNotes[12]||'Belum ada strategi yang dicatat.')}</p></section></div>
  <section class="card" style="margin-top:16px"><h2>5. Tontonan tersimpan</h2>${savedW.length?'<div class="grid two">'+savedW.map(w=>'<div class="watch-card"><a target="_blank" href="'+w.url+'">'+esc(w.title)+'</a><div class="small">'+esc(w.language)+' • '+w.age_min+'-'+w.age_max+' tahun</div></div>').join('')+'</div>':'<p>Belum ada tontonan tersimpan.</p>'}</section>
  <section class="card" style="margin-top:16px"><h2>6. Aktivitas nyata yang cocok</h2>${acts.length?'<div class="row">'+acts.map(a=>'<span class="pill gray">'+esc(a)+'</span>').join('')+'</div>':'<p>Belum ada aktivitas tersimpan/logged.</p>'}</section>
  <div class="grid two" style="margin-top:16px"><section class="card"><h2>7. Parent digital habit</h2><p>Baseline: <b>${esc(state.checkup.parentHabit||'-')}</b></p><p>${esc(state.journeyNotes[11]||'Belum ada catatan Hari 11.')}</p></section><section class="card"><h2>8. Rencana berikutnya</h2><p>${esc(next)}</p></section></div>
  <section class="card hero" style="margin-top:16px"><h2>Maintenance Mode</h2><p>Plan → Use → Log → Learn → Adjust.</p><div class="quick-actions"><button class="ghost" onclick="nav('weekly')">🧠 Weekly Review</button><button class="ghost ai-visible" onclick="nav('coach')">✨ AI Family Coach</button><button class="ghost" onclick="nav('after')">🌱 Setelah Layar</button></div></section>`;
}

function familyContextText(){
  if(!profileReady())return 'Profil keluarga belum diisi.';
  const p=pattern(),savedW=state.savedWatch.map(id=>D.watch.find(w=>w.id===id)).filter(Boolean).slice(0,8),notes=Object.entries(state.journeyNotes).filter(([k,v])=>String(v||'').trim()).slice(-6),recent=state.logs.slice(0,12);
  const goals=selectedGoals(),moments=selectedMoments(),made=new Date().toLocaleString('id-ID');
  return [
    'KONTEKS KELUARGA — Gadget Tanpa Drama',
    'Konteks dibuat dari data hingga: '+made,
    'Nama/panggilan anak: '+(state.profile.name||'-'),
    'Usia: '+(state.profile.age||'-')+' tahun',
    'Caregiver: '+(state.profile.caregiver||'Orang tua'),
    'Tujuan keluarga: '+(goals.length?goals.map(goalLabel).join(' | '):'-'),
    'Prioritas minggu ini: '+goalLabel(state.checkup.priorityGoal||state.checkup.goal||goals[0]),
    'Momen sulit: '+(moments.length?moments.join(' | '):'-'),
    'Waktu bebas layar: '+(state.checkup.anchor||'-'),
    'Target saat ini: '+(state.checkup.target||'-')+' menit/hari',
    'Aktivitas offline yang disukai: '+(state.checkup.fav||'-'),
    'Kebiasaan HP orang tua: '+(state.checkup.parentHabit||'-'),
    p?'Pola: rata-rata aktual '+p.avgAct+' menit; rencana '+p.avgPlan+' menit; konflik paling sering '+(p.risk||'belum terlihat')+'.':'Pola: belum cukup log.',
    'Tontonan tersimpan: '+(savedW.length?savedW.map(w=>w.title).join(' | '):'belum ada'),
    'Catatan 14 hari terbaru: '+(notes.length?notes.map(([k,v])=>'Hari '+k+': '+v).join(' | '):'belum ada'),
    'Log sesi terbaru: '+(recent.length?recent.map(l=>l.date+' '+(l.time||l.period)+', '+l.actual+' menit, warning '+l.warning+', konflik '+l.conflict+', sesudah '+(l.after||'-')).join(' | '):'belum ada')
  ].join('\n');
}
function coachPrompt(mode){
  const guard='Anda adalah AI Family Coach untuk Gadget Tanpa Drama. Gunakan empat prinsip sebagai cara kerja, bukan materi hafalan: batas jelas tanpa mempermalukan; jembatan layar ke pengalaman nyata; ruang eksplorasi; dan respons yang menyoroti usaha, strategi, pilihan, atau kontribusi anak. Gunakan hanya konteks keluarga yang diberikan. Jangan mendiagnosis, jangan menebak akar psikologis, dan jangan menjanjikan perubahan perilaku.';
  const task={transition:'Anak sedang atau sering sulit berhenti. Berikan satu kalimat sekarang, dua langkah transisi, satu aktivitas nyata, dan hal yang perlu dihindari.',conflict:'Ada konflik/protes saat aturan layar ditegakkan. Berikan respons tegas dan hangat maksimal lima langkah.',plan:'Buat rencana tujuh hari berdasarkan seluruh masalah yang tercatat, tetapi pilih hanya satu eksperimen prioritas.',review:'Ringkas apa yang tampak bekerja dan belum bekerja dari log terbaru. Gunakan bahasa deskriptif seperti “terlihat” dan “pada catatan ini”.'}[mode]||'Bantu memilih langkah berikutnya.';
  return guard+'\n\n'+familyContextText()+'\n\nTUGAS:\n'+task+'\n\nFormat: Yang terlihat / Fokus sekarang / Yang bisa dilakukan / Kalimat yang bisa dipakai / Jembatan ke pengalaman nyata / Yang perlu diamati berikutnya.';
}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('✓ Konteks terbaru disalin.');return true}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('✓ Konteks terbaru disalin.');return true}}
function openAI(mode,provider='gemini'){
  const prompt=coachPrompt(mode);copyText(prompt);
  setTimeout(()=>window.open(provider==='chatgpt'?'https://chatgpt.com/':'https://gemini.google.com/app','_blank','noopener'),180);
}
function openGemini(mode){openAI(mode,'gemini')}
function renderCoach(){
  if(!profileReady())return renderOnboard();
  app.innerHTML=`<div class="row space"><div><span class="pill ai">AI tanpa API key produk</span><h1>AI Family Coach</h1><p class="sub">Konteks dibuat ulang dari data terbaru setiap kali tombol ditekan. Gemini atau ChatGPT tidak menerima pembaruan otomatis setelah tab AI sudah terbuka.</p></div></div>
  <section class="card hero"><div class="ai-grid">
  ${[['transition','⏹️ Susah berhenti','Script + transisi'],['conflict','🌪️ Lagi ada konflik','Respons tegas dan hangat'],['review','🔎 Baca pola','Ringkas log terbaru'],['plan','🗓️ Rencana 7 hari','Satu eksperimen prioritas']].map(a=>`<div class="ai-panel"><b>${a[1]}</b><span>${a[2]}</span><div class="row"><button class="primary" onclick="openAI('${a[0]}','gemini')">Gemini</button><button class="ghost" onclick="openAI('${a[0]}','chatgpt')">ChatGPT</button></div></div>`).join('')}</div><div class="notice" style="margin-top:14px"><b>Cara kerja:</b> konteks terbaru disalin ke clipboard, lalu AI pilihan dibuka. Tempelkan konteks di sana.</div></section>
  <section class="card" style="margin-top:16px"><div class="row space"><h2>Preview konteks terbaru</h2><button class="ghost" onclick="copyText(coachPrompt('review'))">Salin sekarang</button></div><pre class="context-preview">${esc(familyContextText())}</pre></section>`;
}
function saveWeeklyReview(form){
  const fd=new FormData(form),item={date:new Date().toISOString().slice(0,10),worked:String(fd.get('worked')||'').trim(),hard:String(fd.get('hard')||'').trim(),principle:String(fd.get('principle')||'').trim(),experiment:String(fd.get('experiment')||'').trim()};
  if(!item.worked&&!item.hard&&!item.experiment){toast('Isi minimal satu bagian review.','warn');return}
  state.maintenance.weeklyReviews=state.maintenance.weeklyReviews||[];state.maintenance.weeklyReviews.unshift(item);state.maintenance.nextExperiment=item.experiment||state.maintenance.nextExperiment||'';save();renderWeekly();setTimeout(()=>toast('✓ Weekly Review tersimpan.'),0);
}
function renderWeekly(){
  if(!profileReady())return renderOnboard();
  const reviews=state.maintenance.weeklyReviews||[];
  app.innerHTML=`<div class="row space"><div><span class="pill ok">Maintenance Loop</span><h1>Weekly Family Review</h1><p class="sub">Review data, pilih satu eksperimen, lalu uji lagi minggu berikutnya.</p></div><div class="row"><button class="primary" onclick="openAI('review','gemini')">✨ Gemini</button><button class="ghost" onclick="openAI('review','chatgpt')">ChatGPT</button></div></div>
  ${patternHTML(true)}
  <form class="card" style="margin-top:16px" onsubmit="event.preventDefault();saveWeeklyReview(this)"><h2>Review minggu ini</h2><label>Apa yang terasa bekerja?</label><textarea name="worked"></textarea><label>Apa yang masih sulit?</label><textarea name="hard"></textarea><label>Prinsip yang ingin dilatih lewat tindakan minggu depan</label><select name="principle"><option>Tegas tanpa reaktif</option><option>Teknologi → pengalaman nyata</option><option>Eksplorasi</option><option>Rasa mampu</option></select><label>Satu eksperimen 7 hari</label><textarea name="experiment" placeholder="Contoh: warning 5 menit + aktivitas pilihan sudah siap sebelum sesi dimulai"></textarea><button class="primary">Simpan Review</button></form>
  <section class="card" style="margin-top:16px"><h2>Riwayat</h2>${reviews.length?reviews.map(r=>`<div class="weekly-item"><b>${esc(r.date)}</b><p><b>Bekerja:</b> ${esc(r.worked||'-')}</p><p><b>Sulit:</b> ${esc(r.hard||'-')}</p><p><b>Fokus tindakan:</b> ${esc(r.principle||'-')}</p><p><b>Eksperimen:</b> ${esc(r.experiment||'-')}</p></div>`).join(''):'<p class="small">Belum ada review.</p>'}</section>`;
}

function renderExplore(){renderAfterScreen('mission')}


function renderSources(){
  const idCount=D.watch.filter(w=>w.language==='Bahasa Indonesia').length;
  app.innerHTML=`<h1>Sumber & Batasan</h1><p class="sub">Produk edukatif untuk membantu keluarga membangun rutinitas digital. Bukan diagnosis, terapi, atau alat penilaian perkembangan.</p><div class="grid two"><div class="card"><h2>Kurasi tontonan</h2><p>Versi MVP menampilkan <b>Bahasa Indonesia saja</b>. Pilihan ditautkan per watch page, bukan rekomendasi algoritma. Orang tua tetap melakukan preview singkat.</p></div><div class="card"><h2>Library aktif</h2><div class="metric">${idCount}</div><p>video/episode Bahasa Indonesia; data English tidak ditampilkan pada MVP.</p></div></div><section class="card" style="margin-top:16px"><h2>Fondasi microlearning</h2><p>Parenting Starter Lab dirumuskan ulang menjadi skenario interaktif dari materi parenting yang dimiliki pemilik produk, lalu dipadukan dengan sumber pengasuhan/perkembangan yang tercantum di bawah. Tidak memuat salinan video, slide, atau transkrip course.</p></section><section class="card" style="margin-top:16px"><h2>Sumber kerangka</h2><table><thead><tr><th>ID</th><th>Sumber</th><th>Dipakai untuk</th></tr></thead><tbody>${D.sources.map(s=>`<tr><td>${esc(s.id)}</td><td><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a></td><td>${esc(s.use)}</td></tr>`).join('')}</tbody></table></section><section class="card" style="margin-top:16px"><h2>Batas penggunaan</h2><p>Insight pola hanya merangkum catatan keluarga. Aplikasi tidak menentukan penyebab psikologis, tidak mendiagnosis, dan tidak menjanjikan tantrum atau konflik hilang dalam 14 hari.</p></section>`;
}
function safeFileName(s){return String(s||'keluarga').trim().replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,40)||'keluarga';}
function backup(){state.meta=state.meta||{};state.meta.lastBackupAt=new Date().toISOString();save();const envelope={magic:BACKUP_MAGIC,version:BACKUP_VERSION,exportedAt:new Date().toISOString(),product:'Gadget Tanpa Drama',state};const blob=new Blob([JSON.stringify(envelope)],{type:'application/octet-stream'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`GTD-${safeFileName(state.profile?.name)}-${new Date().toISOString().slice(0,10)}.gtd`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);setTimeout(()=>toast('✓ Perjalanan tersimpan. Simpan file ini di tempat yang mudah ditemukan.'),80);}
function printReport(){if(blueprintReady())return printBlueprint();if(!profileReady()){alert('Isi profil terlebih dahulu.');return;}const done=completedDays();const pp=pattern();const patterns=pp?[`Rata-rata aktual ${pp.avgAct} menit (rencana ${pp.avgPlan} menit).`,pp.risk?`Waktu konflik tertinggi pada catatan saat ini: ${pp.risk}.`:null,pp.fav?`Aktivitas setelah layar yang paling sering dicatat: ${pp.fav}.`:null].filter(Boolean):[];const html=`<!doctype html><html><head><meta charset="utf-8"><title>Laporan Gadget Tanpa Drama</title><style>body{font-family:Arial,sans-serif;color:#1f2937;padding:30px;max-width:850px;margin:auto}h1,h2{color:#3730a3}.box{border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:14px 0}.small{font-size:12px;color:#6b7280}</style></head><body><h1>Laporan Sementara — Gadget Tanpa Drama</h1><div class="box"><h2>Progress menuju Blueprint</h2><p>${done}/14 hari selesai.</p></div><div class="box"><h2>Family Digital Plan</h2><p>${esc(makePlan())}</p></div><div class="box"><h2>Pola sementara</h2>${patterns.length?'<ul>'+patterns.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'<p>Belum ada cukup data.</p>'}</div><p class="small">Setelah Hari 14, laporan utama berubah menjadi Family Digital Blueprint.</p></body></html>`;const w=window.open('','_blank');w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),250)}
function printBlueprint(){const {p,savedW,acts}=blueprintData();const rules=(state.journeyNotes[13]||'').split(/\n|;/).filter(Boolean).slice(0,5);const next=state.journeyNotes[14]||'Pertahankan aturan yang realistis dan lakukan review mingguan.';const html=`<!doctype html><html><head><meta charset="utf-8"><title>Family Digital Blueprint</title><style>body{font-family:Arial,sans-serif;color:#1f2937;padding:28px;max-width:900px;margin:auto}h1{color:#312e81}h2{color:#4338ca;margin-bottom:6px}.box{border:1px solid #e5e7eb;border-radius:14px;padding:15px;margin:12px 0}.pill{display:inline-block;background:#eef2ff;color:#4338ca;padding:5px 9px;border-radius:999px;margin:3px;font-size:12px}.small{font-size:12px;color:#6b7280}a{color:#4338ca}</style></head><body><h1>Family Digital Blueprint</h1><p class="small">Gadget Tanpa Drama • dibuat dari perjalanan 14 hari keluarga</p><div class="box"><h2>Profil & Fokus</h2><p><b>${esc(state.profile.name)}</b> (${state.profile.age} tahun)</p><p>${esc(makePlan())}</p></div><div class="box"><h2>Aturan Keluarga</h2>${rules.length?'<ul>'+rules.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':`<p>Waktu Bebas Layar Pertama: ${esc(state.checkup.anchor||'-')}<br>Target saat ini: ${state.checkup.target||'-'} menit</p>`}</div><div class="box"><h2>Pola yang Terlihat</h2>${p?`<p>Rata-rata aktual ${p.avgAct} menit; rencana ${p.avgPlan} menit.</p>${p.risk?`<p>Waktu konflik paling sering: ${esc(p.risk)}.</p>`:''}${p.warns?`<p>Dengan warning: ${p.warnConflict}/${p.warns} catatan konflik.</p>`:''}${p.noWarn?`<p>Tanpa warning: ${p.noWarnConflict}/${p.noWarn} catatan konflik.</p>`:''}`:'<p>Belum cukup log.</p>'}</div><div class="box"><h2>Strategi Transisi</h2><p>${esc(state.journeyNotes[6]||'Belum dicatat')}</p><p>${esc(state.journeyNotes[12]||'Belum dicatat')}</p></div><div class="box"><h2>Personal Curated Watch List</h2>${savedW.length?'<ul>'+savedW.map(w=>`<li><a href="${w.url}">${esc(w.title)}</a> — ${esc(w.language)}; ${w.age_min}-${w.age_max} th</li>`).join('')+'</ul>':'<p>Belum ada tontonan tersimpan.</p>'}</div><div class="box"><h2>Aktivitas Pengganti Favorit</h2>${acts.length?acts.map(a=>`<span class="pill">${esc(a)}</span>`).join(''):'<p>Belum ada aktivitas tersimpan.</p>'}</div><div class="box"><h2>Parent Digital Habit</h2><p>${esc(state.journeyNotes[11]||state.checkup.parentHabit||'-')}</p></div><div class="box"><h2>Rencana 30 Hari Berikutnya</h2><p>${esc(next)}</p></div><div class="box"><h2>Kompas 4 Prinsip</h2><p><b>Tegas tanpa reaktif:</b> batas jelas, respons tetap tenang.</p><p><b>Teknologi → pengalaman nyata:</b> layar selalu punya jembatan ke percakapan, gerak, bermain, atau tugas nyata.</p><p><b>Eksplorasi:</b> anak diberi ruang mengamati, bertanya, mencoba, dan bercerita.</p><p><b>Rasa mampu:</b> orang tua menyoroti usaha, strategi, pilihan, dan kontribusi.</p></div><p class="small">Pola bersifat deskriptif dari catatan keluarga, bukan diagnosis atau bukti sebab-akibat. Blueprint dapat diperbarui setelah review mingguan.</p></body></html>`;const w=window.open('','_blank');w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),250)}
function normalizeState(s){s=s||{};s.profile=s.profile||{};s.checkup=s.checkup||{};s.starter=s.starter||{answers:{}};s.starter.answers=s.starter.answers||{};s.days=s.days||{};s.journeyNotes=s.journeyNotes||{};s.logs=s.logs||[];s.parentChecks=s.parentChecks||[];s.savedWatch=s.savedWatch||[];s.savedActivities=s.savedActivities||[];s.maintenance=s.maintenance||{};s.maintenance.weeklyNote=s.maintenance.weeklyNote||'';s.maintenance.weeklyReviews=s.maintenance.weeklyReviews||[];s.maintenance.nextExperiment=s.maintenance.nextExperiment||'';s.meta=s.meta||{};if(!s.meta.familyId)s.meta.familyId=(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now()));return s;}
function importData(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result);let restored;if(parsed&&parsed.magic===BACKUP_MAGIC&&parsed.state){restored=parsed.state}else if(parsed&&parsed.profile){restored=parsed}else{throw new Error('format')}if(!confirm('Pulihkan perjalanan dari file ini? Data yang sekarang ada di perangkat ini akan diganti.'))return;state=normalizeState(restored);save();nav('home');setTimeout(()=>toast('✓ Perjalanan berhasil dipulihkan.'),0)}catch(e){alert('File perjalanan tidak dikenali. Pilih file perjalanan yang dibuat dari Gadget Tanpa Drama.')}};r.readAsText(f);inp.value='';}
function renderData(){const last=formatDateTimeID(state.meta?.lastBackupAt);app.innerHTML=`<div class="row space"><div><h1>Data & Perangkat</h1><p class="sub">Data keluarga tetap di browser ini. Tidak ada login, email, atau database cloud.</p></div><span class="pill ${state.meta?.lastBackupAt?'ok':'warn'}">Backup: ${state.meta?.lastBackupAt?'sudah':'belum'}</span></div><div class="grid two"><section class="card"><h2>Simpan Perjalanan</h2><p>Buat salinan progres agar aman jika browser terhapus atau ingin pindah perangkat.</p><div class="small">Terakhir disimpan: <b>${last}</b></div><br><button class="primary" onclick="backup()">Simpan Perjalanan</button><div class="small" style="margin-top:8px">Browser akan mengunduh satu file perjalanan. Tidak perlu membukanya.</div></section><section class="card"><h2>Pulihkan Perjalanan</h2><p>Pilih file perjalanan yang pernah disimpan. Seluruh progres akan kembali ke aplikasi ini.</p><label class="file-label">Pilih File Perjalanan<input type="file" accept=".gtd,application/json" onchange="importData(this)"></label></section></div><section class="card" style="margin-top:16px"><h2>Kalau ganti HP/laptop</h2><div class="step-list"><div class="step-item">Di perangkat lama tekan <b>Simpan Perjalanan</b>.</div><div class="step-item">Kirim file hasil unduhan ke perangkat baru.</div><div class="step-item">Buka link Gadget Tanpa Drama di perangkat baru, lalu tekan <b>Pulihkan Perjalanan</b>.</div></div></section><section class="card" style="margin-top:16px"><h2>File perjalanan ≠ PDF</h2><p><b>File perjalanan</b> dipakai aplikasi untuk mengembalikan progres. <b>PDF</b> adalah laporan/Blueprint yang dibaca manusia.</p></section><section class="card" style="margin-top:16px"><h2>Privasi lokal</h2><p>Data rutinitas keluarga tidak dikirim ke server produk ini. Data tetap berada di browser sampai Anda menghapus data browser atau mereset aplikasi.</p><button class="ghost danger" onclick="if(confirm('Hapus semua data perjalanan dari perangkat ini? Tindakan ini tidak bisa dibatalkan kecuali Anda punya file perjalanan.')){localStorage.removeItem(KEY);location.reload()}">Reset semua data</button></section>`;}
function render(view){({home:renderHome,starter:renderStarter,checkup:renderCheckup,journey:renderJourney,blueprint:renderBlueprint,today:renderToday,watch:renderWatch,after:renderAfterScreen,activity:renderActivity,log:renderLog,coach:renderCoach,weekly:renderWeekly,explore:renderExplore,data:renderData,sources:renderSources}[view]||renderHome)()}
render('home');
if('serviceWorker' in navigator && location.protocol.startsWith('http')){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
