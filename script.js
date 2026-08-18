// ==================== 导航栏滚动效果 ====================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
});

// ==================== 移动端菜单切换 ====================
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  menuBtn.classList.toggle('open');
  navLinks.classList.toggle('open');
});
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    menuBtn.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ==================== 资源展示三大窗口（动态加载） ====================

function getDisplayFiles() {
  return getStoredFiles().filter(f => f.show !== false);
}

function getFilesByCat(cat) {
  return getDisplayFiles().filter(f => {
    const path = (f.path || f.name).toLowerCase();
    if (cat === 'document') return f.category === 'document' || /\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx)$/i.test(path);
    if (cat === 'image') return f.category === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(path);
    if (cat === 'video') return f.category === 'video' || /\.(mp4|avi|mov|webm|mkv|flv)$/i.test(path);
    return false;
  });
}

function getCatLabel(cat, index) {
  if (cat === 'document') return '文档 ' + (index + 1);
  if (cat === 'image') return '图片 ' + (index + 1);
  if (cat === 'video') return '视频 ' + (index + 1);
  return '文件 ' + (index + 1);
}

function renderResPanels() {
  const cats = [
    { type: 'document', listId: 'resDocList', emptyLabel: '暂无文档' },
    { type: 'image', listId: 'resImgList', emptyLabel: '暂无图片' },
    { type: 'video', listId: 'resVidList', emptyLabel: '暂无视频' }
  ];
  cats.forEach(c => {
    const list = document.getElementById(c.listId);
    if (!list) return;
    const files = getFilesByCat(c.type);
    if (files.length === 0) {
      list.innerHTML = '<div class="res-file-empty">' + c.emptyLabel + '</div>';
      return;
    }
    list.innerHTML = files.map((f, i) =>
      '<div class="res-file-item" data-cat="' + c.type + '" data-idx="' + i + '">' +
      '<span class="rfi-icon">' + (c.type === 'document' ? '📄' : c.type === 'image' ? '🖼️' : '🎬') + '</span>' +
      '<span class="rfi-name">' + getCatLabel(c.type, i) + '</span>' +
      '</div>'
    ).join('');
    list.querySelectorAll('.res-file-item').forEach(item => {
      item.addEventListener('click', function() {
        list.querySelectorAll('.res-file-item').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
        const idx = parseInt(this.getAttribute('data-idx'));
        loadResFile(c.type, files[idx]);
      });
    });
  });
}

function loadResFile(cat, doc) {
  const path = doc.path || doc.name;
  if (cat === 'document') {
    const frame = document.getElementById('resDocFrame');
    const ph = frame ? frame.nextElementSibling : null;
    // Office文件（非PDF）浏览器无法直接预览，显示提示
    if (/\.(docx?|xlsx?|pptx?|wps)$/i.test(path)) {
      if (frame) frame.style.display = 'none';
      if (ph) { ph.style.display = 'flex'; ph.innerHTML = '<span>📄</span><p>此文件格式不支持在线预览</p><small>请将 .docx/.ppt/.xls 文件转换为 PDF 格式后上传</small>'; }
      return;
    }
    if (frame) { frame.style.display = 'block'; frame.src = path + '#toolbar=0&navpanes=0&scrollbar=0'; }
    if (ph) ph.style.display = 'none';
  } else if (cat === 'image') {
    const img = document.getElementById('resImgFrame');
    const ph = img ? img.nextElementSibling : null;
    if (img) {
      img.onerror = null; img.style.display = 'block';
      img.onerror = function() { img.style.display = 'none'; if (ph) ph.style.display = 'flex'; };
      img.src = path;
    }
    if (ph) ph.style.display = 'none';
  } else if (cat === 'video') {
    const vid = document.getElementById('resVidFrame');
    const ph = vid ? vid.nextElementSibling : null;
    if (vid) {
      vid.onerror = null; vid.style.display = 'block';
      vid.onerror = function() { vid.style.display = 'none'; if (ph) ph.style.display = 'flex'; };
      vid.src = path;
    }
    if (ph) ph.style.display = 'none';
  }
}

// ==================== 管理员认证系统 ====================
const ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
const STORAGE_KEY = 'vlab_admin_auth';
const FILES_KEY = 'vlab_uploaded_files';

const authModal = document.getElementById('authModal');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const adminPanel = document.getElementById('adminPanel');
const adminEntry = document.getElementById('adminEntry');

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showAuthModal() {
  if (!authModal) return;
  authModal.classList.add('show');
  authPassword.value = '';
  authError.textContent = '';
  setTimeout(() => authPassword.focus(), 300);
}

function hideAuthModal() {
  if (!authModal) return;
  authModal.classList.remove('show');
}

function showAdminPanel() {
  if (!adminPanel) return;
  adminPanel.classList.add('show');
  renderFileList();
}

function hideAdminPanel() {
  if (!adminPanel) return;
  adminPanel.classList.remove('show');
}

// ==================== 管理面板入口（导航栏+页脚） ====================
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadList = document.getElementById('uploadList');
const fileList = document.getElementById('fileList');
const refreshBtn = document.getElementById('refreshFiles');
const fileCount = document.getElementById('fileCount');

let pendingFiles = [];
let currentCat = 'all';

function getFileCategory(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'].includes(ext)) return 'video';
  return 'document';
}

function getCatIcon(cat) {
  if (cat === 'document') return '📄';
  if (cat === 'image') return '🖼️';
  if (cat === 'video') return '🎬';
  return '📄';
}

function getStoredFiles() {
  try { return JSON.parse(localStorage.getItem(FILES_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveStoredFiles(files) {
  localStorage.setItem(FILES_KEY, JSON.stringify(files));
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function renderPendingList() {
  if (!uploadList) return;
  if (pendingFiles.length === 0) { uploadList.innerHTML = ''; return; }
  uploadList.innerHTML = pendingFiles.map(f =>
    '<div class="upload-item"><span class="ui-name">' + getCatIcon(getFileCategory(f)) + ' ' + f.name +
    '</span><span class="ui-size">' + formatSize(f.size) +
    '</span><span class="ui-status">✅ 已选择</span></div>'
  ).join('');
}

function renderFileList() {
  if (!fileList) return;
  const files = getStoredFiles();
  const filtered = currentCat === 'all' ? files : files.filter(f => f.category === currentCat);
  if (fileCount) fileCount.textContent = '(' + files.length + ')';
  if (filtered.length === 0) {
    fileList.innerHTML = '<p class="file-empty">暂无文件，请上传资源</p>';
    return;
  }
  fileList.innerHTML = filtered.map((f, i) => {
    const globalIdx = files.indexOf(f);
    const isShown = f.show !== false;
    return '<div class="file-row">' +
      '<span class="fr-icon">' + getCatIcon(f.category) + '</span>' +
      '<span class="fr-name" title="' + f.name + '">' + f.name + '</span>' +
      '<span class="fr-size">' + formatSize(f.size) + '</span>' +
      '<span class="fr-date">' + (f.date || '') + '</span>' +
      '<label class="toggle-switch" title="' + (isShown ? '点击隐藏' : '点击显示') + '">' +
      '<input type="checkbox" ' + (isShown ? 'checked' : '') + ' data-idx="' + globalIdx + '" class="show-toggle">' +
      '<span class="toggle-slider"></span></label>' +
      '<span class="toggle-label">' + (isShown ? '显示' : '隐藏') + '</span>' +
      '<button class="fr-del" data-idx="' + globalIdx + '">删除</button>' +
      '</div>';
  }).join('');

  fileList.querySelectorAll('.show-toggle').forEach(cb => {
    cb.addEventListener('change', function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      const allFiles = getStoredFiles();
      allFiles[idx].show = this.checked;
      saveStoredFiles(allFiles);
      renderFileList(); refreshViewerTabs();
    });
  });

  fileList.querySelectorAll('.fr-del').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      const allFiles = getStoredFiles();
      if (confirm('确定要删除文件 "' + allFiles[idx].name + '" 吗？')) {
        allFiles.splice(idx, 1);
        saveStoredFiles(allFiles);
        renderFileList();
        refreshViewerTabs();
      }
    });
  });
}

// 封面图片管理
const coverImgUrl = document.getElementById('coverImgUrl');
const saveCoverImg = document.getElementById('saveCoverImg');
const coverUploadZone = document.getElementById('coverUploadZone');
const coverFileInput = document.getElementById('coverFileInput');

if (coverUploadZone && coverFileInput) {
  coverUploadZone.addEventListener('click', () => coverFileInput.click());
  coverUploadZone.addEventListener('dragover', (e) => { e.preventDefault(); coverUploadZone.classList.add('drag-over'); });
  coverUploadZone.addEventListener('dragleave', () => { coverUploadZone.classList.remove('drag-over'); });
  coverUploadZone.addEventListener('drop', (e) => {
    e.preventDefault(); coverUploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      if (coverImgUrl) coverImgUrl.value = 'images/' + f.name;
    }
  });
  coverFileInput.addEventListener('change', () => {
    if (coverFileInput.files.length > 0 && coverImgUrl) {
      coverImgUrl.value = 'images/' + coverFileInput.files[0].name;
    }
  });
}

if (saveCoverImg) {
  const savedCover = localStorage.getItem('vlab_cover_img') || 'images/cover.jpg';
  if (coverImgUrl) coverImgUrl.value = savedCover;
  saveCoverImg.addEventListener('click', () => {
    const url = (coverImgUrl.value || '').trim() || 'images/cover.jpg';
    localStorage.setItem('vlab_cover_img', url);
    const coverImg = document.querySelector('.hero-cover-img');
    if (coverImg) { coverImg.src = url; coverImg.style.display = 'block'; }
    const coverPh = document.querySelector('.hero-image .image-placeholder');
    if (coverPh) coverPh.style.display = 'none';
  });
}
(function initCover() {
  const savedCover = localStorage.getItem('vlab_cover_img');
  if (savedCover) {
    const coverImg = document.querySelector('.hero-cover-img');
    if (coverImg) {
      coverImg.src = savedCover;
      coverImg.style.display = 'block';
      const coverPh = document.querySelector('.hero-image .image-placeholder');
      if (coverPh) coverPh.style.display = 'none';
    }
  }
})();

// 资源面板默认封面管理
(function initPanelCovers() {
  const panelCovers = JSON.parse(localStorage.getItem('vlab_panel_covers') || '{}');
  const panels = [
    { id: 'resources-doc', key: 'doc', sel: '.res-bp-placeholder' },
    { id: 'resources-img', key: 'img', sel: '.res-bp-placeholder' },
    { id: 'resources-vid', key: 'vid', sel: '.res-bp-placeholder' }
  ];
  panels.forEach(p => {
    const url = panelCovers[p.key];
    if (!url) return;
    const section = document.getElementById(p.id);
    if (!section) return;
    const ph = section.querySelector(p.sel);
    if (!ph) return;
    ph.style.backgroundImage = 'url(' + url + ')';
    ph.style.backgroundSize = 'contain';
    ph.style.backgroundRepeat = 'no-repeat';
    ph.style.backgroundPosition = 'center';
    ph.style.backgroundOrigin = 'content-box';
    ph.style.padding = '20px';
  });
})();

const savePanelCovers = document.getElementById('savePanelCovers');
if (savePanelCovers) {
  const panelCoverDoc = document.getElementById('panelCoverDoc');
  const panelCoverImg = document.getElementById('panelCoverImg');
  const panelCoverVid = document.getElementById('panelCoverVid');
  const saved = JSON.parse(localStorage.getItem('vlab_panel_covers') || '{}');
  if (panelCoverDoc) panelCoverDoc.value = saved.doc || '';
  if (panelCoverImg) panelCoverImg.value = saved.img || '';
  if (panelCoverVid) panelCoverVid.value = saved.vid || '';
  savePanelCovers.addEventListener('click', () => {
    const data = {
      doc: (panelCoverDoc?.value || '').trim(),
      img: (panelCoverImg?.value || '').trim(),
      vid: (panelCoverVid?.value || '').trim()
    };
    localStorage.setItem('vlab_panel_covers', JSON.stringify(data));
    location.reload();
  });
}

function processFiles(fileArr) {
  pendingFiles = [...pendingFiles, ...Array.from(fileArr)];
  renderPendingList();
  const stored = getStoredFiles();
  Array.from(fileArr).forEach(f => {
    const cat = getFileCategory(f);
    let prefix = 'documents/';
    if (cat === 'image') prefix = 'images/';
    if (cat === 'video') prefix = 'videos/';
    stored.push({
      name: f.name, size: f.size, type: f.type, path: prefix + f.name,
      category: cat, show: true,
      date: new Date().toLocaleDateString('zh-CN')
    });
  });
  saveStoredFiles(stored);
  setTimeout(() => {
    pendingFiles = [];
    renderPendingList();
    renderFileList();
    refreshViewerTabs();
  }, 1500);
}

if (uploadBtn) uploadBtn.addEventListener('click', () => fileInput.click());
if (uploadZone) {
  uploadZone.addEventListener('click', (e) => { if (e.target !== uploadBtn) fileInput.click(); });
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('drag-over'); });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault(); uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  });
}
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) { processFiles(e.target.files); fileInput.value = ''; }
  });
}
if (refreshBtn) refreshBtn.addEventListener('click', () => { renderFileList(); refreshViewerTabs(); });

// 手动添加文件
const manualPath = document.getElementById('manualPath');
const manualName = document.getElementById('manualName');
const manualAdd = document.getElementById('manualAdd');
if (manualAdd) {
  manualAdd.addEventListener('click', () => {
    const path = (manualPath.value || '').trim();
    const name = (manualName.value || '').trim();
    if (!path) { alert('请输入文件路径'); return; }
    const displayName = name || path.split('/').pop() || path;
    const cat = getFileCategory({ name: path });
    const stored = getStoredFiles();
    stored.push({ name: displayName, path: path, size: 0, type: '', category: cat, show: true, date: new Date().toLocaleDateString('zh-CN') });
    saveStoredFiles(stored);
    manualPath.value = ''; manualName.value = '';
    renderFileList(); refreshViewerTabs();
  });
}

// 分类筛选
document.querySelectorAll('.cat-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    currentCat = this.getAttribute('data-cat');
    renderFileList();
  });
});

// ==================== 动态刷新资源面板 ====================
function refreshViewerTabs() {
  renderResPanels();
}

// ==================== 管理面板入口（导航栏+页脚） ====================
const navAdmin = document.getElementById('navAdmin');

function openAdminFromNav() {
  if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
    showAdminPanel();
  } else {
    showAuthModal();
  }
}

if (navAdmin) navAdmin.addEventListener('click', (e) => { e.preventDefault(); openAdminFromNav(); });
if (adminEntry) adminEntry.addEventListener('click', openAdminFromNav);

// ==================== 认证成功后的界面更新 ====================
function onAuthSuccess() {
  sessionStorage.setItem(STORAGE_KEY, 'true');
  hideAuthModal();
  showAdminPanel();
  updateAuthUI();
}

function updateAuthUI() {
  const authed = sessionStorage.getItem(STORAGE_KEY) === 'true';
  if (navAdmin) {
    if (authed) { navAdmin.classList.add('authed'); navAdmin.textContent = '✅ 管理'; }
    else { navAdmin.classList.remove('authed'); navAdmin.textContent = '管理'; }
  }
  const toolbar = document.getElementById('editToolbar');
  if (toolbar) {
    if (authed) toolbar.classList.add('show');
    else toolbar.classList.remove('show');
  }
}

function logout() {
  sessionStorage.removeItem(STORAGE_KEY);
  hideAdminPanel();
  disableEditMode();
  updateAuthUI();
}

document.getElementById('authSubmit').addEventListener('click', async () => {
  const pwd = authPassword.value.trim();
  if (!pwd) { authError.textContent = '请输入密码'; return; }
  const hash = await sha256(pwd);
  if (hash === ADMIN_PASSWORD_HASH) {
    onAuthSuccess();
  } else {
    authError.textContent = '密码错误，请重试';
  }
});

authPassword.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') document.getElementById('authSubmit').click();
});

document.getElementById('authCancel').addEventListener('click', hideAuthModal);
document.getElementById('authClose').addEventListener('click', hideAuthModal);
document.getElementById('adminClose').addEventListener('click', hideAdminPanel);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('toolbarLogout').addEventListener('click', logout);

authModal.addEventListener('click', function(e) {
  if (e.target === authModal) hideAuthModal();
});

// ==================== 页面内直接编辑系统 ====================
const CONTENT_KEY = 'vlab_page_content';
let editMode = false;

function getStoredContent() {
  try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveStoredContent(content) {
  localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
}

function applyStoredContent() {
  const content = getStoredContent();
  document.querySelectorAll('[data-editable]').forEach(el => {
    const key = el.getAttribute('data-editable');
    if (content[key] !== undefined) {
      el.textContent = content[key];
    }
  });
}

function enableEditMode() {
  editMode = true;
  document.body.classList.add('edit-mode');
  const toggleBtn = document.getElementById('toggleEditMode');
  if (toggleBtn) {
    toggleBtn.innerHTML = '<span class="et-icon">✏️</span> 编辑模式 ON';
    toggleBtn.classList.add('active');
  }
  document.querySelectorAll('[data-editable]').forEach(el => {
    el.setAttribute('contenteditable', 'true');
    el.addEventListener('focus', function() { this.classList.add('editing'); });
    el.addEventListener('blur', function() {
      this.classList.remove('editing');
      const key = this.getAttribute('data-editable');
      const content = getStoredContent();
      content[key] = this.textContent;
      saveStoredContent(content);
    });
  });
}

function disableEditMode() {
  editMode = false;
  document.body.classList.remove('edit-mode');
  const toggleBtn = document.getElementById('toggleEditMode');
  if (toggleBtn) {
    toggleBtn.innerHTML = '<span class="et-icon">✏️</span> 编辑模式 OFF';
    toggleBtn.classList.remove('active');
  }
  document.querySelectorAll('[data-editable]').forEach(el => {
    el.setAttribute('contenteditable', 'false');
    el.classList.remove('editing');
  });
}

function toggleEditMode() {
  if (editMode) { disableEditMode(); }
  else { enableEditMode(); }
}

const toggleEditBtn = document.getElementById('toggleEditMode');
if (toggleEditBtn) {
  toggleEditBtn.addEventListener('click', toggleEditMode);
}

// ==================== 文件上传管理（含分类、开关） ====================

// ==================== 反下载保护 ====================
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    if (document.querySelector('.viewer-frame-wrap:hover') ||
        document.querySelector('.resource-viewer:hover')) {
      e.preventDefault();
      return false;
    }
  }
});

// ==================== 从 config.json 加载默认配置 ====================
(function loadDefaultConfig() {
  if (localStorage.getItem(FILES_KEY)) return;
  fetch('config.json')
    .then(r => r.json())
    .then(cfg => {
      if (cfg.files) localStorage.setItem(FILES_KEY, JSON.stringify(cfg.files));
      if (cfg.coverImg) localStorage.setItem('vlab_cover_img', cfg.coverImg);
      if (cfg.panelCovers) localStorage.setItem('vlab_panel_covers', JSON.stringify(cfg.panelCovers));
      if (cfg.content) localStorage.setItem(CONTENT_KEY, JSON.stringify(cfg.content));
      refreshViewerTabs();
      applyStoredContent();
      (function initCover() {
        const savedCover = localStorage.getItem('vlab_cover_img');
        if (savedCover) {
          const coverImg = document.querySelector('.hero-cover-img');
          if (coverImg) { coverImg.src = savedCover; coverImg.style.display = 'block'; }
          const coverPh = document.querySelector('.hero-image .image-placeholder');
          if (coverPh) coverPh.style.display = 'none';
        }
      })();
    })
    .catch(() => {});
})();

// ==================== 初始化 ====================
refreshViewerTabs();
applyStoredContent();
updateAuthUI();

if (sessionStorage.getItem(STORAGE_KEY) === 'true') {
  showAdminPanel();
  updateAuthUI();
}