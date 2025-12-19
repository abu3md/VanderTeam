const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

function toggleLoader(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden-section', !show);
}

// تحميل البيانات مع معالجة الخطأ
async function loadData() {
    toggleLoader(true);
    try {
        const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
        if (error) throw error;
        mangas = data || [];
        renderHome();
    } catch (err) {
        console.error("خطأ في الاتصال:", err.message);
        alert("لا يمكن الاتصال بقاعدة البيانات. تأكد من الـ API Key.");
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
    grid.innerHTML = '';
    if (mangas.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">لا توجد مانجا حالياً.</p>';
        return;
    }
    mangas.forEach(m => {
        grid.innerHTML += `
            <div class="manga-card" onclick="openManga('${m.id}')">
                <img src="${m.cover}" class="card-image" onerror="this.src='mainL.png'">
                <div class="manga-title-overlay">${m.title}</div>
            </div>`;
    });
}

// دالة الحفظ المعدلة
async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("يرجى كتابة الاسم واختيار صورة الغلاف.");
    
    toggleLoader(true);

    try {
        // 1. رفع الصورة
        const fileName = `covers/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const { data: uploadData, error: uploadError } = await _supabase.storage
            .from('vander-files')
            .upload(fileName, file);

        if (uploadError) throw new Error("فشل رفع الصورة: " + uploadError.message);

        // 2. الحصول على الرابط
        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        // 3. الحفظ في الجدول
        const { error: dbError } = await _supabase.from('mangas').insert([{
            title: title,
            desc: desc,
            cover: publicUrl,
            chapters: [],
            lastUpdated: new Date()
        }]);

        if (dbError) throw new Error("فشل حفظ البيانات: " + dbError.message);

        alert("تم حفظ المانجا بنجاح!");
        document.getElementById('manga-title').value = '';
        document.getElementById('manga-desc').value = '';
        loadData();
    } catch (err) {
        alert(err.message);
    }
    toggleLoader(false);
}

// رفع فصل جديد
async function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if (!mId || !file || !title) return alert("أكمل جميع بيانات الفصل");
    
    toggleLoader(true);
    try {
        const fileName = `chapters/${Date.now()}_chapter.pdf`;
        const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);
        if (upErr) throw upErr;

        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);
        const m = mangas.find(x => x.id == mId);
        const newChapters = [...(m.chapters || []), { id: Date.now(), title: title, url: urlData.publicUrl }];

        const { error: updateErr } = await _supabase.from('mangas')
            .update({ chapters: newChapters, lastUpdated: new Date() })
            .eq('id', mId);

        if (updateErr) throw updateErr;

        alert("تم رفع الفصل بنجاح!");
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
    const list = document.getElementById('chapters-list');
    list.innerHTML = (m.chapters || []).map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')">${c.title} <span>قراءة ←</span></li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}#toolbar=0"></iframe>`;
    showSection('reader-view');
}

function backToManga() { showSection('manga-details-view'); }

// نظام الدخول
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u === 'samer' && p === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("اسم المستخدم أو كلمة المرور غير صحيحة");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        updateSelects();
    } else {
        showSection('login-view');
    }
}

function updateSelects() {
    const html = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = '<option value="">اختر المانجا</option>' + html;
    document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر المانجا</option>' + html;
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

function filterManga() {
    const q = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('.manga-card').forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(q) ? 'block' : 'none';
    });
}

window.onload = loadData;