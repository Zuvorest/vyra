
import { useState, useEffect, useRef } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons } from './ui.js';

const cleanText = (text) => {
    if (!text) return '';
    let result = ''; let inBracket = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '[') inBracket = true;
        else if (char === ']') inBracket = false;
        else if (!inBracket) result += char;
    }
    return result.trim();
};

// Daftar Kontak

const CONTACTS = [
  {
    id: 'elisa',
    name: 'Elisa',
    avatar: '/image/elisa.png',
    desc: 'Cewek manis, lucu, perhatian, dan sedikit jahil. 19 tahun.'
  },
  {
    id: 'cila',
    name: 'Cila',
    avatar: '/image/cila.png',
    desc: 'Anak kecil polos, bandel, cengeng, aktif, dan bawel. 12 tahun.'
  },
  {
    id: 'umi_lala',
    name: 'Umi Lala',
    avatar: '/image/lala.png',
    desc: 'Ustadzah yang alim, lembut, sabar, bijaksana, dan berwawasan luas tentang agama Islam.'
  },
    {
    id: 'acep',
    name: 'Acep Si betawi',
    avatar: '/image/acep.png',
    desc: 'Acep Si orang Betawi Asli.'
  },
      {
    id: 'stefani',
    name: 'Stefani',
    avatar: '/image/stefani.png',
    desc: 'Cewek yang manja, romantis'
  }
];


function AudioPlayer({ url }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);
    const bars = [30, 60, 40, 80, 100, 50, 70, 90, 40, 60, 80, 30, 50, 90, 70, 40, 60, 100, 80, 50, 30, 70, 90, 60, 40];

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio || !url) return;
        if (isPlaying) { audio.pause(); setIsPlaying(false); } 
        else { audio.play().then(() => setIsPlaying(true)).catch(console.error); }
    };

    const formatTime = (time) => {
        if (!time || isNaN(time) || !isFinite(time)) return '0:00';
        const m = Math.floor(time / 60); const s = Math.floor(time % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !audio.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration; setProgress(pct * 100);
    };

    return html`
        <div className="naxa-vn-wrap">
            ${url ? html`<audio ref=${audioRef} src=${url} onLoadedMetadata=${(e) => setDuration(e.target.duration)} onTimeUpdate=${(e) => { setCurrentTime(e.target.currentTime); if (e.target.duration) setProgress((e.target.currentTime / e.target.duration) * 100); }} onEnded=${() => { setIsPlaying(false); setProgress(0); setCurrentTime(0); }} style=${{ display: 'none' }} />` : null}
            <div className="naxa-vn">
                <button className="naxa-vn-btn" onClick=${togglePlay}>
                    ${isPlaying ? html`<${Icons.Pause} size=${20} fill="currentColor" />` : html`<${Icons.Play} size=${20} fill="currentColor" style=${{ marginLeft: '3px' }} />`}
                </button>
                <div className="naxa-vn-main" onClick=${handleSeek}>
                    <div className="naxa-waveform">
                        ${bars.map((h, i) => {
                            const isFilled = (i / bars.length) * 100 <= progress;
                            return html`<div className=${'naxa-bar ' + (isFilled ? 'filled' : '')} style=${{ height: h + '%' }} />`;
                        })}
                    </div>
                    <div className="naxa-vn-times">
                        <span>${formatTime(isPlaying ? currentTime : duration)}</span><span>${formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default function CharacterChat() {
    const [activeChat, setActiveChat] = useState(null); // null = laci, string = ruang chat
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [mode, setMode] = useState('audio'); 
    const [isTyping, setIsTyping] = useState(false);
    const [toast, setToast] = useState(null);
    const bottomRef = useRef(null);

    const loadHistory = (charId) => {
        api(`/api/chat/history?character_id=${charId}`).then(r => setMessages(r.data || [])).catch(() => {});
    };

    useEffect(() => {
        if (activeChat) loadHistory(activeChat);
    }, [activeChat]);

    useEffect(() => {
        if (activeChat && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, activeChat]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = input.trim();
        const cost = mode === 'audio' ? 4 : 2;
        
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, id: Date.now() }]);
        setIsTyping(true);

        try {
            const res = await api('/api/chat/send', {
                method: 'POST',
                body: { message: userMsg, mode, character_id: activeChat }
            });
            
            setMessages(prev => [...prev, { role: 'model', content: res.data.text, audio_url: res.data.audio, id: Date.now() + 1 }]);
            setToast(`-${cost} Kredit`);
            setTimeout(() => setToast(null), 2500);
            window.dispatchEvent(new Event('refresh-user'));

        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== Date.now() && m.role !== 'user' || m.content !== userMsg));
            alert(e.message || 'Gagal mengirim pesan. Cek saldo kredit kamu.');
        } finally {
            setIsTyping(false);
        }
    };

    const handleClearChat = async () => {
        if (!confirm(`Hapus semua pesan dengan ${CONTACTS.find(c => c.id === activeChat).name}?`)) return;
        try {
            await api(`/api/chat/clear?character_id=${activeChat}`, { method: 'DELETE' });
            setMessages([]);
            alert('Chat berhasil dibersihkan.');
        } catch (e) { alert('Gagal menghapus: ' + e.message); }
    };

    if (!activeChat) {
        return html`
            <div className="naxa-app">
                ${toast && html`<div className="naxa-toast"><${Icons.Zap} size=${14} /> ${toast}</div>`}
                <div className="naxa-header">
                    <h2 style=${{ margin: 0, fontSize: '20px', color: '#fff' }}>Pesan</h2>
                </div>
                <div className="naxa-contact-list">
                    ${CONTACTS.map(c => html`
                        <div key=${c.id} className="naxa-contact-item" onClick=${() => setActiveChat(c.id)}>
                            <img src=${c.avatar} alt=${c.name} className="naxa-avatar" />
                            <div className="naxa-contact-info">
                                <div className="naxa-contact-name">${c.name}</div>
                                <div className="naxa-contact-msg">${c.desc}</div>
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    const activeChar = CONTACTS.find(c => c.id === activeChat);

    return html`
        <div className="naxa-app">
            ${toast && html`<div className="naxa-toast"><${Icons.Zap} size=${14} /> ${toast}</div>`}
            <div className="naxa-header">
                <div style=${{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="naxa-back-btn" onClick=${() => setActiveChat(null)}>
                        <${Icons.ArrowLeft} size=${20} />
                    </button>
                    <img src=${activeChar.avatar} alt=${activeChar.name} className="naxa-avatar-sm" />
                    <div>
                        <div style=${{ fontWeight: 'bold', color: '#fff', fontSize: '15px' }}>${activeChar.name}</div>
                        <div style=${{ fontSize: '12px', color: 'var(--success)' }}>Online</div>
                    </div>
                </div>
                
                <div style=${{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="naxa-mode-toggle" onClick=${() => setMode(m => m === 'audio' ? 'text' : 'audio')}>
                        <span className=${mode === 'audio' ? 'active' : ''}>Audio</span>
                        <span className=${mode === 'text' ? 'active' : ''}>Chat</span>
                    </div>
                    <button className="naxa-clear-btn" onClick=${handleClearChat} title="Hapus chat ini">
                        <${Icons.Trash2} size=${18} />
                    </button>
                </div>
            </div>

            <div className="naxa-messages">
                ${messages.map((m, i) => html`
                    <div key=${i} className=${'naxa-msg-row ' + (m.role === 'user' ? 'naxa-out' : 'naxa-in')}>
                        ${m.role === 'model' ? html`<img src=${activeChar.avatar} className="naxa-avatar-xs" />` : null}
                        <div className=${'naxa-bubble ' + (m.role === 'user' ? 'naxa-bubble-out' : 'naxa-bubble-in')}>
                            ${m.role === 'model' && m.audio_url ? html`
                                <${AudioPlayer} url=${m.audio_url} />
                            ` : html`
                                <div className="naxa-text">${cleanText(m.content)}</div>
                            `}
                        </div>
                    </div>
                `)}
                ${isTyping ? html`
                    <div className="naxa-msg-row naxa-in">
                        <img src=${activeChar.avatar} className="naxa-avatar-xs" />
                        <div className="naxa-bubble naxa-bubble-in" style=${{ padding: '12px 16px' }}>
                            <div className="wa-typing"><span></span><span></span><span></span></div>
                        </div>
                    </div>
                ` : null}
                <div ref=${bottomRef} />
            </div>

            <div className="naxa-input-area">
                <input 
                    value=${input}
                    onInput=${e => setInput(e.target.value)}
                    onKeyDown=${e => e.key === 'Enter' && sendMessage()}
                    placeholder="Ketik pesan..."
                    disabled=${isTyping}
                />
                <button onClick=${sendMessage} disabled=${isTyping || !input.trim()}>
                    <${Icons.Send} size=${18} />
                </button>
            </div>
        </div>
    `;
}
