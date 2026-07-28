export function playBuzzerSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create an oscillator
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    // Sawtooth gives it that harsh "game show" buzzer feel
    oscillator.type = 'sawtooth';
    
    // Frequency sweep from 300Hz down to 150Hz
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
    
    // Volume envelope (fast attack, slight hold, fast decay)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05); // attack
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + 0.2); // hold
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4); // decay
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.error('AudioContext not supported or blocked', e);
  }
}
