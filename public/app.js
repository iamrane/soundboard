(() => {
  const grid = document.getElementById('pad-grid');
  const lcdStatus = document.getElementById('lcd-status');
  const lcdMeter = document.getElementById('lcd-meter');
  const lcdTime = document.getElementById('lcd-time');
  const stopBtn = document.getElementById('stop-btn');

  const KEY_HINTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const METER_BLOCKS = 12;

  let clips = [];
  let clipsJson = '';
  let player = null;
  let playerReady = false;
  let currentClip = null;
  let progressTimer = null;

  function setLcd(status, progress) {
    lcdStatus.textContent = status;
    if (progress == null) {
      lcdMeter.innerHTML = '';
      lcdTime.textContent = '';
    } else {
      const on = Math.round(progress.fraction * METER_BLOCKS);
      lcdMeter.innerHTML =
        '▮'.repeat(on) + `<span class="off">${'▯'.repeat(METER_BLOCKS - on)}</span>`;
      lcdTime.textContent = `${formatTime(progress.elapsed)}/${formatTime(progress.total)}`;
    }
  }

  function renderPads() {
    grid.innerHTML = '';
    if (clips.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-board';
      empty.innerHTML = 'No pads on the board yet.<br />Add clips in the <a href="/admin">admin panel</a> and they show up here for everyone.';
      grid.appendChild(empty);
      return;
    }
    clips.forEach((clip, i) => {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = `pad led-${clip.color}`;
      pad.dataset.id = clip.id;
      pad.innerHTML = `
        <span class="pad-top">
          <span class="pad-led"></span>
          <span class="pad-key">${i < KEY_HINTS.length ? KEY_HINTS[i] : ''}</span>
        </span>
        <span class="pad-name"></span>
        <span class="pad-meta">
          <span>${formatTime(clip.end - clip.start)}</span>
          <span class="pad-state"></span>
        </span>
        <span class="pad-progress"></span>`;
      pad.querySelector('.pad-name').textContent = clip.name;
      pad.addEventListener('click', () => togglePad(clip));
      grid.appendChild(pad);
    });
    if (currentClip) markPlaying(currentClip.id, true);
  }

  function markPlaying(id, playing) {
    const pad = grid.querySelector(`.pad[data-id="${CSS.escape(id)}"]`);
    if (!pad) return;
    pad.classList.toggle('playing', playing);
    pad.querySelector('.pad-state').textContent = playing ? 'PLAY' : '';
    if (!playing) pad.querySelector('.pad-progress').style.width = '0%';
  }

  function clearPlayback() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
    if (currentClip) markPlaying(currentClip.id, false);
    currentClip = null;
    setLcd(`READY · ${clips.length} PADS`, null);
  }

  function stop() {
    if (player && playerReady) player.stopVideo();
    clearPlayback();
  }

  function togglePad(clip) {
    if (currentClip && currentClip.id === clip.id) {
      stop();
      return;
    }
    if (!playerReady) {
      setLcd('AUDIO ENGINE LOADING…', null);
      return;
    }
    if (currentClip) markPlaying(currentClip.id, false);
    currentClip = clip;
    markPlaying(clip.id, true);
    setLcd(`► ${clip.name}`, { fraction: 0, elapsed: 0, total: clip.end - clip.start });
    player.loadVideoById({
      videoId: clip.videoId,
      startSeconds: clip.start,
      endSeconds: clip.end,
    });
    player.setVolume(100);

    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (!currentClip) return;
      const t = player.getCurrentTime() || currentClip.start;
      const total = currentClip.end - currentClip.start;
      const elapsed = Math.min(Math.max(t - currentClip.start, 0), total);
      const fraction = total > 0 ? elapsed / total : 0;
      const pad = grid.querySelector(`.pad[data-id="${CSS.escape(currentClip.id)}"]`);
      if (pad) pad.querySelector('.pad-progress').style.width = `${fraction * 100}%`;
      setLcd(`► ${currentClip.name}`, { fraction, elapsed, total });
    }, 150);
  }

  function initPlayer() {
    player = new YT.Player('yt-holder', {
      width: 320,
      height: 180,
      playerVars: { playsinline: 1, disablekb: 1 },
      events: {
        onReady: () => {
          playerReady = true;
          setLcd(`READY · ${clips.length} PADS`, null);
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) clearPlayback();
        },
        onError: () => {
          setLcd('ERR · CLIP UNAVAILABLE', null);
          if (progressTimer) clearInterval(progressTimer);
          progressTimer = null;
          if (currentClip) markPlaying(currentClip.id, false);
          currentClip = null;
        },
      },
    });
  }

  async function refreshClips() {
    try {
      const res = await fetch('/api/clips');
      if (!res.ok) return;
      const next = await res.json();
      const json = JSON.stringify(next);
      if (json === clipsJson) return;
      clipsJson = json;
      clips = next;
      renderPads();
      if (!currentClip) setLcd(playerReady ? `READY · ${clips.length} PADS` : 'BOOTING…', null);
    } catch {
      setLcd('ERR · SERVER OFFLINE', null);
    }
  }

  stopBtn.addEventListener('click', stop);

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') return stop();
    const index = KEY_HINTS.indexOf(e.key);
    if (index >= 0 && clips[index]) togglePad(clips[index]);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshClips();
  });

  refreshClips();
  setInterval(refreshClips, 8000);
  withYouTubeApi(initPlayer);
})();
