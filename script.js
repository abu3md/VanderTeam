// استيراد مكتبات فايربيس
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- 1. إعدادات فايربيس (ضع بياناتك هنا) ---
const firebaseConfig = {
    apiKey: "AIzaSyD...",      // استبدل هذا
    authDomain: "...",         // استبدل هذا
    projectId: "...",          // استبدل هذا
    storageBucket: "...",      // استبدل هذا
    messagingSenderId: "...",  // استبدل هذا
    appId: "..."               // استبدل هذا
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- 2. متغيرات وحالة التطبيق ---
let allMangas = [];
let currentMangaId = null;

// --- 3. الدوال المساعدة (UI Helpers) ---
function showLoader(show) {
    const loader = document.getElementById('loading-overlay');
    if(show) loader.classList.remove('hidden-section');
    else loader.classList.add('hidden-section');
}

function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden-section'));
    document.querySelectorAll('main > section').forEach(sec => sec.classList.remove('active-section'));
    const target = document.getElementById(sectionId);
    if(target) {
        target.classList.remove('hidden-section');
        target.classList.add('active-section');
    }
}

// --- 4. جلب البيانات من السيرفر ---
async function fetchMangas() {
    showLoader(true);
    try {
        const querySnapshot = await getDocs(collection(db, "mangas"));
        allMangas = [];
        querySnapshot.forEach((doc) => {
            allMangas.push({ id: doc.id, ...doc.data() });
        });
        renderGrid(allMangas);
    } catch (e) {
        console.error("Error fetching data: ", e);
        alert("حدث خطأ في الاتصال بقاعدة البيانات");
    }
    showLoader(false);
}

function renderGrid(mangaList) {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = '';
    
    // ترتيب حسب الأحدث تحديثاً
    mangaList.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    mangaList.forEach(manga => {
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.onclick = () => openMangaDetails(manga.id);
        card.innerHTML = `
            <img src="${manga.coverUrl}" class="card-image" loading="lazy">
            <div class="manga-title-overlay">${manga.title}</div>
            <div class="card-lines">
                <div class="line"></div>
                <div class="line short"></div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- 5. وظائف الأدمن ---
document.getElementById('btn-login-submit').addEventListener('click', () => {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    if(u === 'samer' && p === 'Samer#1212') {
        sessionStorage.setItem('adminLogged', 'true');
        checkAdmin();
    } else {
        document.getElementById('login-error').innerText = 'خطأ في البيانات';
    }
});

function checkAdmin() {
    if(sessionStorage.getItem('adminLogged')) {
        showSection('admin-dashboard');
        loadMangaOptions();
    } else {
        showSection('login-view');
    }
}

function loadMangaOptions() {
    const select = document.getElementById('manga-select');
    select.innerHTML = '<option value="">اختر المانجا</option>';
    allMangas.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.title;
        select.appendChild(opt);
    });
}

// إضافة مانجا جديدة
document.getElementById('form-add-manga').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    
    const title = document.getElementById('manga-title').value;
    const author = document.getElementById('manga-author').value;
    const artist = document.getElementById('manga-artist').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];
    
    try {
        // 1. رفع الصورة
        const storageRef = ref(storage, 'covers/' + Date.now() + '-' + file.name);
        await uploadBytes(storageRef, file);
        const coverUrl = await getDownloadURL(storageRef);
        
        // 2. حفظ البيانات في Firestore
        await addDoc(collection(db, "mangas"), {
            title, author, artist, desc, coverUrl,
            lastUpdated: new Date().toISOString(),
            chapters: []
        });
        
        alert("تمت الإضافة بنجاح!");
        document.getElementById('form-add-manga').reset();
        await fetchMangas(); // تحديث القائمة المحلية
        loadMangaOptions();
    } catch (error) {
        console.error(error);
        alert("فشل الرفع: " + error.message);
    }
    showLoader(false);
});

// إضافة فصل جديد (PDF)
document.getElementById('btn-upload-chapter').addEventListener('click', async () => {
    const mangaId = document.getElementById('manga-select').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if(!mangaId || !title || !file) return alert("يرجى ملء جميع الحقول");
    
    showLoader(true);
    try {
        // 1. رفع PDF
        const storageRef = ref(storage, 'chapters/' + mangaId + '/' + Date.now() + '.pdf');
        await uploadBytes(storageRef, file);
        const pdfUrl = await getDownloadURL(storageRef);
        
        // 2. تحديث وثيقة المانجا
        const mangaRef = doc(db, "mangas", mangaId);
        await updateDoc(mangaRef, {
            lastUpdated: new Date().toISOString(),
            chapters: arrayUnion({
                title: title,
                url: pdfUrl,
                date: new Date().toLocaleDateString('ar-EG')
            })
        });

        alert("تم رفع الفصل بنجاح!");
        document.getElementById('chapter-title').value = '';
        document.getElementById('chapter-file').value = '';
        await fetchMangas();
    } catch (error) {
        console.error(error);
        alert("خطأ أثناء الرفع");
    }
    showLoader(false);
});

// --- 6. تفاصيل المانجا والقارئ ---
async function openMangaDetails(id) {
    showLoader(true);
    // جلب أحدث البيانات للمانجا المختارة
    const docRef = doc(db, "mangas", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        currentMangaId = id;
        
        document.getElementById('detail-cover').src = data.coverUrl;
        document.getElementById('detail-title').innerText = data.title;
        document.getElementById('detail-author').innerText = data.author;
        document.getElementById('detail-artist').innerText = data.artist;
        document.getElementById('detail-updated').innerText = new Date(data.lastUpdated).toLocaleDateString('ar-EG');
        document.getElementById('detail-desc').innerText = data.desc;

        const list = document.getElementById('chapters-list');
        list.innerHTML = '';
        
        // عكس الترتيب لعرض الفصول الجديدة في الأعلى
        if(data.chapters) {
            [...data.chapters].reverse().forEach(chap => {
                const li = document.createElement('li');
                li.innerText = `${chap.title} (${chap.date})`;
                li.onclick = () => openReader(chap.url, chap.title);
                list.appendChild(li);
            });
        }
        showSection('manga-details-view');
    }
    showLoader(false);
}

function openReader(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer').src = url + "#toolbar=0&navpanes=0&scrollbar=1";
    showSection('reader-view');
}

// --- 7. Event Listeners للأزرار العامة ---
document.getElementById('btn-home').onclick = () => showSection('home-view');
document.getElementById('btn-back-home').onclick = () => showSection('home-view');
document.getElementById('btn-admin').onclick = () => checkAdmin();
document.getElementById('btn-logout').onclick = () => {
    sessionStorage.removeItem('adminLogged');
    showSection('home-view');
};
document.getElementById('btn-close-reader').onclick = () => {
    if(currentMangaId) openMangaDetails(currentMangaId);
    else showSection('home-view');
};

// تبديلات الأدمن
document.getElementById('tab-add-manga').onclick = (e) => {
    document.querySelectorAll('.admin-content').forEach(d => d.classList.add('hidden-tab'));
    document.getElementById('add-manga-panel').classList.remove('hidden-tab');
    document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active-tab'));
    e.target.classList.add('active-tab');
};
document.getElementById('tab-add-chapter').onclick = (e) => {
    document.querySelectorAll('.admin-content').forEach(d => d.classList.add('hidden-tab'));
    document.getElementById('add-chapter-panel').classList.remove('hidden-tab');
    document.querySelectorAll('.admin-tabs button').forEach(b => b.classList.remove('active-tab'));
    e.target.classList.add('active-tab');
};

// البحث
document.getElementById('search-input').addEventListener('keyup', (e) => {
    const val = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.manga-card');
    cards.forEach(card => {
        const title = card.querySelector('.manga-title-overlay').innerText.toLowerCase();
        card.style.display = title.includes(val) ? 'block' : 'none';
    });
});

// بدء التطبيق
fetchMangas();