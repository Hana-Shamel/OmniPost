/**
 * OmniPost AI • Frontend Logic & Interactivity
 */

document.addEventListener('DOMContentLoaded', () => {
  // ============================================
  // State Management
  // ============================================
  const state = {
    currentPost: null,
    history: [],
    platform: 'linkedin',
    tone: 'enthusiastic',
    length: 'medium',
    include_emojis: 'engaging',
    deepReflection: true,
    isGenerating: false,
    historyFilter: 'all',
    historySearch: ''
  };

  const PLATFORM_CONFIGS = {
    linkedin: {
      name: 'LinkedIn',
      limit: 3000,
      badgeClass: 'badge-linkedin',
      cardClass: 'platform-linkedin',
      author: 'Alex Chen',
      handle: '• 1st',
      bio: 'AI Founder & Tech Strategist',
      avatarIcon: 'fa-user-tie',
      shareUrl: (text) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
      limitHint: 'Max 3,000 chars'
    },
    twitter: {
      name: 'Twitter / X',
      limit: 280,
      badgeClass: 'badge-twitter',
      cardClass: 'platform-twitter',
      author: 'Alex Chen',
      handle: '@alexchen_ai',
      bio: 'Building AI tools in public',
      avatarIcon: 'fa-robot',
      shareUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      limitHint: 'Max 280 chars'
    },
    instagram: {
      name: 'Instagram',
      limit: 2200,
      badgeClass: 'badge-instagram',
      cardClass: 'platform-instagram',
      author: 'alexchen.creative',
      handle: '',
      bio: 'Tech • Future of AI • Design',
      avatarIcon: 'fa-camera',
      shareUrl: (text) => `https://www.instagram.com/`,
      limitHint: 'Max 2,200 chars'
    },
    facebook: {
      name: 'Facebook',
      limit: 5000,
      badgeClass: 'badge-facebook',
      cardClass: 'platform-facebook',
      author: 'Alex Chen',
      handle: '',
      bio: 'Public Post',
      avatarIcon: 'fa-users',
      shareUrl: (text) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
      limitHint: 'Max 5,000 chars'
    }
  };

  // ============================================
  // DOM Element References
  // ============================================
  const form = document.getElementById('generatorForm');
  const subjectInput = document.getElementById('subjectInput');
  const clearSubjectBtn = document.getElementById('clearSubjectBtn');
  const keyMessageInput = document.getElementById('keyMessageInput');
  const targetAudienceInput = document.getElementById('targetAudienceInput');
  const generateBtn = document.getElementById('generateBtn');
  const platformLimitHint = document.getElementById('platformLimitHint');
  const lengthInput = document.getElementById('lengthInput');
  const referenceContextInput = document.getElementById('referenceContextInput');
  const clearDocBtn = document.getElementById('clearDocBtn');
  const docFileInput = document.getElementById('docFileInput');
  const docDropZone = document.getElementById('docDropZone');
  const docFileChips = document.getElementById('docFileChips');
  let uploadedFiles = [];

  // Preview & Mockup Elements
  const mockupCard = document.getElementById('mockupCard');
  const mockupAuthor = document.getElementById('mockupAuthor');
  const mockupHandle = document.getElementById('mockupHandle');
  const mockupBio = document.getElementById('mockupBio');
  const mockupAvatar = document.getElementById('mockupAvatar');
  const mockupBody = document.getElementById('mockupBody');
  const mockupTime = document.getElementById('mockupTime');
  const charCountEl = document.getElementById('charCount');
  const charLimitLabelEl = document.getElementById('charLimitLabel');
  const wordCountEl = document.getElementById('wordCount');
  const hashtagCountEl = document.getElementById('hashtagCount');

  // Buttons & Controls
  const copyPostBtn = document.getElementById('copyPostBtn');
  const shareTwitterBtn = document.getElementById('shareTwitterBtn');
  const shareLinkedInBtn = document.getElementById('shareLinkedInBtn');
  const shareFacebookBtn = document.getElementById('shareFacebookBtn');
  const downloadTextBtn = document.getElementById('downloadTextBtn');
  const progressContainer = document.getElementById('generationProgress');
  const progressStage = document.getElementById('progressStage');
  const progressFill = document.getElementById('progressFill');

  // Reflection View Elements
  const reflectionDrawer = document.getElementById('reflectionDrawer');
  const reflectionToggleBtn = document.getElementById('reflectionToggleBtn');
  const reflectionContent = document.getElementById('reflectionContent');
  const reflectionText = document.getElementById('reflectionText');
  const cotPlanText = document.getElementById('cotPlanText');

  // History Drawer Elements
  const historyBtn = document.getElementById('historyBtn');
  const historyDrawer = document.getElementById('historyDrawer');
  const historyOverlay = document.getElementById('historyOverlay');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const historyBadge = document.getElementById('historyBadge');
  const historySearchInput = document.getElementById('historySearchInput');
  const historyFilterTabs = document.querySelectorAll('.filter-tab');

  // Theme Toggle
  const themeToggle = document.getElementById('themeToggle');

  // ============================================
  // Platform Selection
  // ============================================
  const platformButtons = document.querySelectorAll('.platform-btn');
  platformButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      platformButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const platform = btn.dataset.platform;
      state.platform = platform;
      document.getElementById('selectedPlatform').value = platform;
      updatePlatformMockupView(platform);
    });
  });

  function updatePlatformMockupView(platformKey) {
    const config = PLATFORM_CONFIGS[platformKey] || PLATFORM_CONFIGS.linkedin;
    platformLimitHint.textContent = config.limitHint;
    charLimitLabelEl.textContent = `/ ${config.limit.toLocaleString()} max`;

    // Update mockup card visual theme
    mockupCard.className = `mockup-card ${config.cardClass}`;
    mockupAuthor.textContent = config.author;
    mockupHandle.textContent = config.handle;
    mockupBio.textContent = config.bio;
    mockupAvatar.innerHTML = `<i class="fa-solid ${config.avatarIcon}"></i>`;

    // Re-verify character limit styling if content exists
    if (state.currentPost) {
      updateStats(state.currentPost.content);
      updateShareLinks(state.currentPost.content);
    }
  }

  // ============================================
  // Emoji Toggle
  // ============================================
  const emojiToggle = document.getElementById('emojiToggle');
  const selectedEmojiInput = document.getElementById('selectedEmoji');
  if (emojiToggle) {
    emojiToggle.addEventListener('change', () => {
      const value = emojiToggle.checked ? 'engaging' : 'none';
      state.include_emojis = value;
      selectedEmojiInput.value = value;
    });
  }

  // ============================================
  // Document Upload & Reference Notes Handlers
  // ============================================
  if (docFileInput) {
    docFileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });
  }

  if (docDropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      docDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        docDropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      docDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        docDropZone.classList.remove('drag-over');
      });
    });

    docDropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      try {
        const text = await readFileAsText(file);
        if (text && text.trim()) {
          uploadedFiles.push({ name: file.name, size: file.size, content: text });
          const separator = referenceContextInput.value.trim() ? '\n\n--- [Document: ' + file.name + '] ---\n' : '--- [Document: ' + file.name + '] ---\n';
          referenceContextInput.value += separator + text.trim();
          showToast(`📄 Added document: ${file.name}`, 'info');
        }
      } catch (err) {
        console.error('File read error:', err);
        showToast(`Could not read file ${file.name}`, 'error');
      }
    }
    renderDocChips();
    clearDocBtn.style.display = referenceContextInput.value.trim() ? 'block' : 'none';
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  function renderDocChips() {
    if (!docFileChips) return;
    if (uploadedFiles.length === 0) {
      docFileChips.style.display = 'none';
      docFileChips.innerHTML = '';
      return;
    }

    docFileChips.style.display = 'flex';
    docFileChips.innerHTML = uploadedFiles.map((file, idx) => `
      <span class="doc-chip">
        <i class="fa-solid fa-file-lines"></i>
        <span>${escapeHtml(file.name)}</span>
        <i class="fa-solid fa-xmark doc-chip-remove" data-index="${idx}" title="Remove file"></i>
      </span>
    `).join('');

    docFileChips.querySelectorAll('.doc-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        uploadedFiles.splice(index, 1);
        renderDocChips();
      });
    });
  }

  if (referenceContextInput) {
    referenceContextInput.addEventListener('input', () => {
      clearDocBtn.style.display = referenceContextInput.value.trim() ? 'block' : 'none';
    });
  }

  if (clearDocBtn) {
    clearDocBtn.addEventListener('click', () => {
      referenceContextInput.value = '';
      uploadedFiles = [];
      renderDocChips();
      clearDocBtn.style.display = 'none';
      if (docFileInput) docFileInput.value = '';
    });
  }

  // ============================================
  // Quick Inspiration & Audience Chips
  // ============================================
  document.querySelectorAll('#inspirationChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      subjectInput.value = chip.dataset.topic;
      clearSubjectBtn.style.display = 'block';
      subjectInput.focus();
    });
  });

  document.querySelectorAll('#audienceChips .quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      targetAudienceInput.value = chip.dataset.audience;
    });
  });

  subjectInput.addEventListener('input', () => {
    clearSubjectBtn.style.display = subjectInput.value.trim() ? 'block' : 'none';
  });

  clearSubjectBtn.addEventListener('click', () => {
    subjectInput.value = '';
    clearSubjectBtn.style.display = 'none';
    subjectInput.focus();
  });

  // ============================================
  // Accordions
  // ============================================
  reflectionToggleBtn.addEventListener('click', () => {
    const isOpen = reflectionContent.style.display !== 'none';
    reflectionContent.style.display = isOpen ? 'none' : 'block';
    const arrow = reflectionToggleBtn.querySelector('.fa-chevron-down');
    if (arrow) {
      arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  });

  // ============================================
  // HTML Entity Decoding Helper
  // ============================================
  function decodeEntities(str) {
    if (!str) return '';
    return str
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  // ============================================
  // Form Submission & Multi-Stage Generation
  // ============================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const subject = subjectInput.value.trim();
    if (!subject) {
      showToast('Please enter a subject / topic', 'error');
      subjectInput.focus();
      return;
    }

    const toneInput = document.getElementById('toneInput');

    const payload = {
      subject: subject,
      tone: toneInput.value.trim() || 'Enthusiastic',
      key_message: keyMessageInput.value.trim(),
      target_audience: targetAudienceInput.value.trim() || 'General Audience',
      length: lengthInput.value.trim() ? `${lengthInput.value.trim()} words` : '150 words',
      include_emojis: state.include_emojis,
      platform: state.platform,
      deep_reflection: true,
      reference_context: referenceContextInput ? referenceContextInput.value.trim() : ''
    };

    setGeneratingState(true);

    try {
      // Simulate progressive stages for UX delight
      startStageSimulation(true);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Generation request failed');
      }

      const result = await response.json();
      if (result.success && result.post) {
        // Decode HTML entities before setting state and showing output
        if (result.post.content) result.post.content = decodeEntities(result.post.content);
        if (result.post.reflection) result.post.reflection = decodeEntities(result.post.reflection);
        if (result.post.cot_plan) result.post.cot_plan = decodeEntities(result.post.cot_plan);

        state.currentPost = result.post;
        renderGeneratedPost(result.post);
        showToast('🎉 Social media post generated successfully!', 'success');
        loadHistory();
      }
    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setGeneratingState(false);
    }
  });

  let stageInterval = null;
  function startStageSimulation(isDeep) {
    const stages = isDeep ? [
      'Synthesizing Chain-of-Thought Planning & Hook Strategy...',
      'Drafting Platform-Specific Narrative & Structure...',
      'Executing Reflect / View / Require Critique Analysis...',
      'Polishing Final High-Converting Output & Hashtags...'
    ] : [
      'Synthesizing Platform Structure & Hook...',
      'Writing Optimized Social Copy...'
    ];

    let current = 0;
    progressStage.textContent = stages[0];
    if (stageInterval) clearInterval(stageInterval);

    stageInterval = setInterval(() => {
      current++;
      if (current < stages.length) {
        progressStage.textContent = stages[current];
      }
    }, 2800);
  }

  function setGeneratingState(isGenerating) {
    state.isGenerating = isGenerating;
    generateBtn.disabled = isGenerating;
    if (isGenerating) {
      progressContainer.style.display = 'flex';
      generateBtn.querySelector('.btn-text').textContent = 'Generating with AI...';
      generateBtn.querySelector('.btn-icon').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    } else {
      progressContainer.style.display = 'none';
      if (stageInterval) clearInterval(stageInterval);
      generateBtn.querySelector('.btn-text').textContent = 'Generate Optimized Post';
      generateBtn.querySelector('.btn-icon').innerHTML = '<i class="fa-solid fa-sparkles"></i>';
    }
  }

  // ============================================
  // Render Generated Post
  // ============================================
  function renderGeneratedPost(post) {
    if (!post) return;
    post.content = decodeEntities(post.content || '');
    const rawContent = post.content;

    // Decode HTML entities and highlight hashtags as clickable badges
    const formattedHtml = escapeHtml(decodeEntities(rawContent))
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/(#\w+)/g, '<span class="hashtag-tag">$1</span>');

    mockupBody.innerHTML = formattedHtml;
    mockupTime.innerHTML = `Just now • <i class="fa-solid fa-globe"></i>`;

    updateStats(rawContent);
    updateShareLinks(rawContent);

    // Enable copy button
    copyPostBtn.disabled = false;

    // Show AI Reasoning drawer if reflection exists
    if (post.reflection || post.cot_plan) {
      reflectionDrawer.style.display = 'block';
      reflectionText.textContent = decodeEntities(post.reflection || 'No reflection details available.');
      cotPlanText.textContent = decodeEntities(post.cot_plan || 'Direct prompt strategy.');
    } else {
      reflectionDrawer.style.display = 'none';
    }
  }

  function updateStats(text) {
    const charCount = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const hashtags = (text.match(/#\w+/g) || []).length;
    const readingTime = Math.max(1, Math.round(words / 200));

    charCountEl.textContent = charCount.toLocaleString();
    wordCountEl.textContent = words.toLocaleString();
    hashtagCountEl.textContent = hashtags;

    // Check platform character limit
    const config = PLATFORM_CONFIGS[state.platform] || PLATFORM_CONFIGS.linkedin;
    if (charCount > config.limit) {
      charCountEl.style.color = 'var(--accent-rose)';
      charLimitLabelEl.textContent = `/ ${config.limit} (Exceeds Limit!)`;
    } else {
      charCountEl.style.color = 'var(--text-primary)';
      charLimitLabelEl.textContent = `/ ${config.limit.toLocaleString()} max`;
    }
  }

  function updateShareLinks(text) {
    const encoded = encodeURIComponent(text);
    shareTwitterBtn.href = `https://twitter.com/intent/tweet?text=${encoded}`;
    shareLinkedInBtn.href = `https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`;
    shareFacebookBtn.href = `https://www.facebook.com/sharer/sharer.php?quote=${encoded}`;
  }

  // ============================================
  // Copy to Clipboard & Download Actions
  // ============================================
  copyPostBtn.addEventListener('click', async () => {
    if (!state.currentPost) return;
    try {
      await navigator.clipboard.writeText(state.currentPost.content);
      showToast('📋 Post copied to clipboard!', 'success');
    } catch (e) {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = state.currentPost.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('📋 Post copied to clipboard!', 'success');
    }
  });

  downloadTextBtn.addEventListener('click', () => {
    if (!state.currentPost) {
      showToast('Generate a post first to download', 'info');
      return;
    }
    const filename = `post_${state.platform}_${Date.now()}.txt`;
    const blob = new Blob([state.currentPost.content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`💾 Saved as ${filename}`, 'success');
  });

  // ============================================
  // History Drawer Management
  // ============================================
  function toggleHistoryDrawer(open) {
    historyDrawer.classList.toggle('open', open);
    historyOverlay.classList.toggle('open', open);
  }

  historyBtn.addEventListener('click', () => toggleHistoryDrawer(true));
  closeHistoryBtn.addEventListener('click', () => toggleHistoryDrawer(false));
  historyOverlay.addEventListener('click', () => toggleHistoryDrawer(false));

  async function loadHistory() {
    try {
      let url = '/api/history';
      const params = new URLSearchParams();
      if (state.historySearch) params.append('search', state.historySearch);
      if (state.historyFilter && state.historyFilter !== 'all') params.append('platform', state.historyFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      state.history = data.history || [];
      renderHistoryList(state.history);
      historyBadge.textContent = state.history.length;
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  function renderHistoryList(items) {
    if (!items || items.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <i class="fa-solid fa-ghost"></i>
          <p>No generated posts found.</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = items.map(item => {
      const config = PLATFORM_CONFIGS[item.platform] || PLATFORM_CONFIGS.linkedin;
      const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="history-item" data-id="${item.id}">
          <div class="item-top">
            <span class="item-badge ${config.badgeClass}">${config.name}</span>
            <span class="item-date">${formattedDate}</span>
          </div>
          <div class="item-subject">${escapeHtml(item.subject)}</div>
          <div class="item-preview">${escapeHtml(item.content)}</div>
          <div class="item-actions">
            <div class="item-stats-text" style="font-size: 0.72rem; color: var(--text-muted);">
              ${item.character_count} chars • ${item.tone}
            </div>
            <div class="item-btn-group">
              <button class="btn-icon-subtle btn-copy-history" data-id="${item.id}" title="Copy text">
                <i class="fa-regular fa-copy"></i>
              </button>
              <button class="btn-icon-subtle btn-load-history" data-id="${item.id}" title="Load into Generator & Preview">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </button>
              <button class="btn-icon-subtle text-danger btn-delete-history" data-id="${item.id}" title="Delete">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach dynamic click listeners
    historyList.querySelectorAll('.btn-copy-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = state.history.find(h => h.id === id);
        if (item) {
          navigator.clipboard.writeText(item.content);
          showToast('📋 Copied post to clipboard!', 'success');
        }
      });
    });

    historyList.querySelectorAll('.btn-load-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = state.history.find(h => h.id === id);
        if (item) {
          loadHistoryItemIntoUI(item);
          toggleHistoryDrawer(false);
          showToast(`Loaded post: "${item.subject}"`, 'info');
        }
      });
    });

    historyList.querySelectorAll('.btn-delete-history').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        try {
          await fetch(`/api/history/${id}`, { method: 'DELETE' });
          showToast('Deleted from history', 'info');
          loadHistory();
        } catch (err) {
          showToast('Failed to delete item', 'error');
        }
      });
    });
  }

  function loadHistoryItemIntoUI(item) {
    subjectInput.value = item.subject || '';
    clearSubjectBtn.style.display = subjectInput.value ? 'block' : 'none';
    keyMessageInput.value = item.key_message || '';
    targetAudienceInput.value = item.target_audience || '';

    // Switch platform
    const platform = item.platform || 'linkedin';
    state.platform = platform;
    document.getElementById('selectedPlatform').value = platform;
    platformButtons.forEach(b => b.classList.toggle('active', b.dataset.platform === platform));
    updatePlatformMockupView(platform);

    // Switch tone
    toneInput.value = item.tone || 'Enthusiastic';

    // Render in preview
    state.currentPost = item;
    renderGeneratedPost(item);

    if (item.length) {
      const numericLength = item.length.toString().replace(/\D/g, '');
      lengthInput.value = numericLength || '150';
    }

    if (referenceContextInput) {
      referenceContextInput.value = item.reference_context || '';
      clearDocBtn.style.display = referenceContextInput.value ? 'block' : 'none';
      uploadedFiles = [];
      renderDocChips();
    }
  }

  clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all history?')) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      showToast('All history cleared', 'info');
      loadHistory();
    } catch (e) {
      showToast('Failed to clear history', 'error');
    }
  });

  historySearchInput.addEventListener('input', () => {
    state.historySearch = historySearchInput.value.trim();
    loadHistory();
  });

  historyFilterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      historyFilterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.historyFilter = tab.dataset.filter;
      loadHistory();
    });
  });

  // ============================================
  // Theme Toggle (Dark/Light)
  // ============================================
  const savedTheme = localStorage.getItem('omnipost_theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    if (isLight) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem('omnipost_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
      localStorage.setItem('omnipost_theme', 'light');
    }
  });

  // ============================================
  // Toast Notifications
  // ============================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return decodeEntities(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Initial Load
  loadHistory();
});
