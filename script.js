const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

function toggleLoader(show) {
    const loader = document.getElementById('loading-overlay');
    if(loader) loader.classList.toggle('hidden-section', !show);
}

async function loadData() {
    toggleLoader(true);
    try {
        const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
        if (error) throw error;
        mangas = data || [];
        renderHome();
    } catch (err) {
        console.error("خطأ:", err.message);
    }
    toggleLoader(false);
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden-section');
    if (id === 'home-view') loadData();
}

function renderHome() {
    const grid = document.getElementById('manga-grid');
    if(!grid) return;
    grid.innerHTML = '';
    mangas.forEach(m => {
        grid.innerHTML += `
            <div class="manga-card" onclick="openManga('${m.id}')">
                <img src="${m.cover}" class="card-image" onerror="this.src='mainL.png'">
                <div class="manga-title-overlay">${m.title}</div>
            </div>`;
    });
}

async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("أكمل البيانات");
    
    toggleLoader(true);
    try {
        const fileName = `covers/${Date.now()}_${file.name}`;
        const { error: upError } = await _supabase.storage.from('vander-files').upload(fileName, file);
        if (upError) throw upError;

        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const { error: dbError } = await _supabase.from('mangas').insert([{
            title: title, desc: desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
        }]);

        if (dbError) throw dbError;

        alert("تم الحفظ بنجاح!");
        loadData();
    } catch (err) {
        alert("فشل الحفظ: " + err.message);
    }
    toggleLoader(false);
}

async function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if (!mId || !file) return alert("بيانات ناقصة");
    
    toggleLoader(true);
    try {
        const fileName = `chapters/${Date.now()}.pdf`;
        await _supabase.storage.from('vander-files').upload(fileName, file);
        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);
        const m = mangas.find(x => x.id == mId);
        const newChapters = [...(m.chapters || []), { id: Date.now(), title, url: urlData.publicUrl }];

        await _supabase.from('mangas').update({ chapters: newChapters, lastUpdated: new Date() }).eq('id', mId);
        alert("تم رفع الفصل!");
        loadData();
    } catch (err) {
        alert("خطأ: " + err.message);
    }
    toggleLoader(false);
}

function openManga(id) {
    const m = mangas.find(x => x.id == id);
    if(!m) return;
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc;
    document.getElementById('chapters-list').innerHTML = (m.chapters || []).map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')">${c.title} <span>قراءة ←</span></li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

function login() {
    if (document.getElementById('username').value === 'samer' && 
        document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("خطأ");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        const opts = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
        document.getElementById('manga-select-add').innerHTML = '<option value="">اختر</option>' + opts;
    } else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }
window.onload = loadData;