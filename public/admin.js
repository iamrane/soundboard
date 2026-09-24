(() => {
  const form = document.getElementById('clip-form');
  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-btn');
  const cancelEdit = document.getElementById('cancel-edit');
  const formMsg = document.getElementById('form-msg');
  const colorPicker = document.getElementById('color-picker');
  const clipList = document.getElementById('clip-list');
  const lcdStatus = document.getElementById('lcd-status');

  const COLORS = ['coral', 'amber', 'yellow', 'lime', 'teal', 'blue', 'violet', 'pink'];
  const PREVIEW_ID = '__preview__';
  const previewBtn = document.getElementById('preview-btn');

  let clips = [];
  let editingId = null;
  let player = null;
  let playerReady = false;
  let testingId = null;
  let testTimer = null;

  // Color swatches
  COLORS.forEach((color, i) => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="radio" name="color" value="${color}" ${i === 0 ? 'checked' : ''} />
      <span class="swatch" style="background: var(--led-${color}); color: var(--led-${color});"></span>`;
    colorPicker.appendChild(label);
  });

  function setMsg(text, kind) {
    formMsg.textContent = text;
    formMsg.className = `form-msg ${kind || ''}`;
  }

  function resetForm() {
    form.reset();
    form.querySelector('input[name="color"]').checked = true;
    editingId = null;
    formTitle.textContent = 'Add clip';
    submitBtn.textContent = 'Add to board';
    cancelEdit.hidden = true;
  }

  function startEdit(clip) {
    editingId = clip.id;
    form.elements.name.value = clip.name;
    form.elements.url.value = `https://www.youtube.com/watch?v=${clip.videoId}`;
    form.elements.start.value = clip.start;
    form.elements.end.value = clip.end;
    const colorInput = form.querySelector(`input[name="color"][value="${clip.color}"]`);
    if (colorInput) colorInput.checked = true;
    formTitle.textContent = `Edit — ${clip.name}`;
    submitBtn.textContent = 'Save changes';
    cancelEdit.hidden = false;
    setMsg('', '');
    form.elements.name.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function syncPreviewBtn() {
    previewBtn.textContent = testingId === PREVIEW_ID ? '■ Stop test' : '► Test timing';
  }

  function stopTest() {
    if (player && playerReady) player.stopVideo();
    if (testTimer) clearTimeout(testTimer);
    testTimer = null;
    testingId = null;
    lcdStatus.textContent = 'ADMIN MODE';
    renderList();
    syncPreviewBtn();
  }

  function testPlay(clip) {
    if (testingId === clip.id) return stopTest();
    if (!playerReady) {
      lcdStatus.textContent = 'AUDIO ENGINE LOADING…';
      return;
    }
    testingId = clip.id;
    lcdStatus.textContent = `TEST ► ${clip.name}`;
    player.loadVideoById({ videoId: clip.videoId, startSeconds: clip.start, endSeconds: clip.end });
    player.setVolume(100);
    renderList();
    syncPreviewBtn();
  }

  function renderList() {
    clipList.innerHTML = '';
    if (clips.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'list-empty';
      empty.textContent = 'No clips yet. Add the first one above — everyone on the board sees it immediately.';
      clipList.appendChild(empty);
      return;
    }
    clips.forEach((clip) => {
      const row = document.createElement('div');
      row.className = 'clip-row';
      row.innerHTML = `
        <img class="clip-thumb" alt="" loading="lazy"
             src="https://i.ytimg.com/vi/${clip.videoId}/mqdefault.jpg" />
        <div class="clip-info">
          <div class="clip-name"><span class="dot" style="background: var(--led-${clip.color});"></span><span class="clip-name-text"></span></div>
          <div class="clip-detail">${clip.videoId} · ${clip.start}s → ${clip.end}s (${formatTime(clip.end - clip.start)})</div>
        </div>
        <div class="clip-actions">
          <button class="mini-btn ${testingId === clip.id ? 'playing' : ''}" data-act="test" type="button">
            ${testingId === clip.id ? '■ Stop' : '► Test'}
          </button>
          <button class="mini-btn" data-act="edit" type="button">Edit</button>
          <button class="mini-btn danger" data-act="delete" type="button">Delete</button>
        </div>`;
      row.querySelector('.clip-name-text').textContent = clip.name;
      row.querySelector('[data-act="test"]').addEventListener('click', () => testPlay(clip));
      row.querySelector('[data-act="edit"]').addEventListener('click', () => startEdit(clip));
      // Two-step inline confirm: first click arms the button, second click deletes.
      const deleteBtn = row.querySelector('[data-act="delete"]');
      let disarmTimer = null;
      deleteBtn.addEventListener('click', async () => {
        if (!deleteBtn.classList.contains('armed')) {
          deleteBtn.classList.add('armed');
          deleteBtn.textContent = 'Sure?';
          disarmTimer = setTimeout(() => {
            deleteBtn.classList.remove('armed');
            deleteBtn.textContent = 'Delete';
          }, 3000);
          return;
        }
        clearTimeout(disarmTimer);
        const res = await fetch(`/api/clips/${clip.id}`, { method: 'DELETE' });
        if (res.ok || res.status === 404) {
          if (editingId === clip.id) resetForm();
          if (testingId === clip.id) stopTest();
          await refresh();
          setMsg(`Deleted "${clip.name}".`, 'ok');
        }
      });
      clipList.appendChild(row);
    });
  }

  async function refresh() {
    const res = await fetch('/api/clips');
    if (res.ok) {
      clips = await res.json();
      renderList();
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const start = parseTime(form.elements.start.value);
    const end = parseTime(form.elements.end.value);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      setMsg('Times must be seconds (7.5) or minutes:seconds (1:23).', 'error');
      return;
    }
    const payload = {
      name: form.elements.name.value,
      url: form.elements.url.value,
      start,
      end,
      color: form.querySelector('input[name="color"]:checked').value,
    };
    const res = await fetch(editingId ? `/api/clips/${editingId}` : '/api/clips', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(body.error || 'Something went wrong saving the clip.', 'error');
      return;
    }
    setMsg(editingId ? `Saved "${body.name}".` : `Added "${body.name}" to the board.`, 'ok');
    resetForm();
    await refresh();
  });

  // Plays the form's current URL + start/end without saving anything.
  previewBtn.addEventListener('click', () => {
    if (testingId === PREVIEW_ID) return stopTest();
    const videoId = extractVideoId(form.elements.url.value);
    if (!videoId) return setMsg('Enter a valid YouTube URL to test the timing.', 'error');
    const start = parseTime(form.elements.start.value);
    const end = parseTime(form.elements.end.value);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return setMsg('Enter a start and end time (end after start) to test the timing.', 'error');
    }
    setMsg('', '');
    testPlay({
      id: PREVIEW_ID,
      name: form.elements.name.value.trim() || 'PREVIEW',
      videoId,
      start,
      end,
    });
  });

  cancelEdit.addEventListener('click', () => {
    resetForm();
    setMsg('', '');
  });

  withYouTubeApi(() => {
    player = new YT.Player('yt-holder', {
      width: 320,
      height: 180,
      playerVars: { playsinline: 1, disablekb: 1 },
      events: {
        onReady: () => { playerReady = true; },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED && testingId) stopTest();
        },
        onError: () => {
          if (testingId) {
            lcdStatus.textContent = 'ERR · CLIP UNAVAILABLE';
            testingId = null;
            renderList();
          }
        },
      },
    });
  });

  refresh();
})();
