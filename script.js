const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

function toggleLoader(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden-section', !show);
}

async function loadData() {
    toggleLoader(true);
    const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    if (!error) {
        mangas = data;
        renderHome();
    }
    toggleLoader(false);
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if (id === 'home-view') loadData();
}

function renderHome() {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = '';
    mangas.forEach(m => {
        grid.innerHTML += `
            <div class="manga-card" onclick="openManga('${m.id}')">
                <img src="${m.cover}" class="card-image">
                <div class="manga-title-overlay">${m.title}</div>
            </div>`;
    });
}

// إضافة المانجا
async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("أكمل البيانات");
    toggleLoader(true);

    const fileName = `covers/${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage.from('vander-files').upload(fileName, file);

    if (error) {
        console.error("Storage Error:", error);
        toggleLoader(false);
        return alert("فشل الرفع للسيرفر. تأكد من تفعيل Policies في السوبابيس.");
    }

    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    await _supabase.from('mangas').insert([{
        title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
    }]);

    alert("تمت الإضافة!");
    loadData();
    toggleLoader(false);
}

// رفع الفصل
async function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if (!mId || !file) return alert("اختر المانجا والملف");
    toggleLoader(true);

    const fileName = `chapters/${Date.now()}.pdf`;
    const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);

    if(upErr) { toggleLoader(false); return alert("خطأ رفع PDF"); }

    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);
    const m = mangas.find(x => x.id == mId);
    const updatedChaps = [...m.chapters, { id: Date.now(), title, url: urlData.publicUrl }];

    await _supabase.from('mangas').update({ chapters: updatedChaps, lastUpdated: new Date() }).eq('id', mId);

    alert("تم رفع الفصل!");
    loadData();
    toggleLoader(false);
}

function openManga(id) {
    const m = mangas.find(x => x.id == id);
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc;
    document.getElementById('chapters-list').innerHTML = m.chapters.map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')">${c.title}</li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

function backToManga() { showSection('manga-details-view'); }

// نظام الدخول
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
        document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر</option>' + opts;
    } else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

window.onload = loadData;