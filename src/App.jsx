import React, { useMemo, useState } from "react";
import { CalendarDays, Camera, Clock3, Gauge, MapPin, Plus, Search, Star, Thermometer, Waves } from "lucide-react";
import { motion } from "framer-motion";
import "./index.css";

const initialTrips = [
  {
    id: 1,
    title: "Cebu Blue Trip",
    country: "Philippines",
    region: "Moalboal / Mactan",
    period: "2026.05.01 - 2026.05.05",
    dives: 8,
    maxDepth: 31,
    cover: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1400&auto=format&fit=crop",
    tags: ["Fun Dive", "Turtle", "Coral Reef"],
  },
  {
    id: 2,
    title: "Jeju Weekend Dive",
    country: "Korea",
    region: "Seogwipo",
    period: "2026.06.12 - 2026.06.14",
    dives: 4,
    maxDepth: 18,
    cover: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?q=80&w=1400&auto=format&fit=crop",
    tags: ["Training", "Boat", "Photo"],
  },
  {
    id: 3,
    title: "Okinawa Reef Diary",
    country: "Japan",
    region: "Blue Cave",
    period: "2026.09.02 - 2026.09.07",
    dives: 10,
    maxDepth: 27,
    cover: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?q=80&w=1400&auto=format&fit=crop",
    tags: ["Nitrox", "Reef", "Blue Cave"],
  },
];

const recentDives = [
  { site: "Moalboal Sardine Run", date: "2026.05.01", depth: "28m", time: "47min", temp: "27°C", type: "Fun Dive", memo: "정어리 떼와 거북이를 본 다이빙" },
  { site: "Pescador Island", date: "2026.05.02", depth: "31m", time: "50min", temp: "26°C", type: "Drift", memo: "조류가 약간 있었지만 시야가 좋았음" },
  { site: "Seogwipo Boat Point", date: "2026.06.13", depth: "18m", time: "42min", temp: "21°C", type: "Training", memo: "중성부력 연습과 사진 촬영" },
];

export default function App() {
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState(recentDives);
  const [form, setForm] = useState({ site: "", date: "", depth: "", time: "", temp: "", type: "Fun Dive", memo: "" });

  const trips = useMemo(() => {
    const keyword = query.toLowerCase();
    return initialTrips.filter((trip) => `${trip.title} ${trip.country} ${trip.region} ${trip.tags.join(" ")}`.toLowerCase().includes(keyword));
  }, [query]);

  const totalDives = initialTrips.reduce((sum, trip) => sum + trip.dives, 0) + logs.length;
  const maxDepth = Math.max(...initialTrips.map((trip) => trip.maxDepth));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.site.trim()) return;

    setLogs((prev) => [
      {
        site: form.site,
        date: form.date || new Date().toISOString().slice(0, 10),
        depth: form.depth ? `${form.depth}m` : "-",
        time: form.time ? `${form.time}min` : "-",
        temp: form.temp ? `${form.temp}°C` : "-",
        type: form.type,
        memo: form.memo || "메모 없음",
      },
      ...prev,
    ]);

    setForm({ site: "", date: "", depth: "", time: "", temp: "", type: "Fun Dive", memo: "" });
  };

  return (
    <div className="app-shell">
      <header className="hero-section">
        <nav className="navbar">
          <div className="brand">
            <div className="brand-icon"><Waves size={24} /></div>
            <div>
              <strong>Dive Diary</strong>
              <span>Scuba Logbook</span>
            </div>
          </div>
          <div className="nav-links">
            <a href="#trips">Trips</a>
            <a href="#logs">Logs</a>
            <a href="#new-log">New Log</a>
          </div>
          <a className="nav-button" href="#new-log"><Plus size={17} /> 기록하기</a>
        </nav>

        <div className="hero-content">
          <motion.div className="hero-text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="eyebrow">🌊 나만의 스쿠버다이빙 감성 로그북</span>
            <h1>바닷속 기억을 여행처럼 기록하세요.</h1>
            <p>다이빙 여행, 포인트, 최대수심, 수온, 버디, 사진 메모를 한 곳에 모아 관리하는 개인 로그북 웹앱입니다.</p>
            <div className="hero-actions">
              <a href="#new-log" className="primary-button">첫 로그 기록하기</a>
              <a href="#trips" className="secondary-button">샘플 여행 보기</a>
            </div>
          </motion.div>

          <motion.div className="hero-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <img src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1400&auto=format&fit=crop" alt="scuba diving" />
            <div className="hero-card-overlay">
              <span>Featured Trip</span>
              <h2>Cebu Blue Trip</h2>
              <div className="chips">
                <b>8 dives</b><b>Max 31m</b><b>27°C</b><b>Turtle</b>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="main-content">
        <section className="stats-grid">
          <StatCard icon={<Waves />} label="Total Dives" value={totalDives} />
          <StatCard icon={<Gauge />} label="Max Depth" value={`${maxDepth}m`} />
          <StatCard icon={<Camera />} label="Photos" value="148" />
          <StatCard icon={<MapPin />} label="Countries" value="3" />
        </section>

        <section id="trips" className="section-block">
          <div className="section-heading">
            <div>
              <span>Trip Collection</span>
              <h2>다이빙 여행</h2>
            </div>
            <div className="search-box">
              <Search size={18} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="여행, 국가, 태그 검색" />
            </div>
          </div>

          <div className="trip-grid">
            {trips.map((trip) => (
              <article className="trip-card" key={trip.id}>
                <img src={trip.cover} alt={trip.title} />
                <div className="trip-body">
                  <div className="trip-title-row">
                    <div>
                      <h3>{trip.title}</h3>
                      <p><MapPin size={15} /> {trip.country} · {trip.region}</p>
                      <p><CalendarDays size={15} /> {trip.period}</p>
                    </div>
                    <strong>{trip.dives} dives</strong>
                  </div>
                  <div className="tag-row">
                    {trip.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="two-column">
          <section id="new-log" className="form-panel">
            <span>New Dive Log</span>
            <h2>오늘의 다이빙 기록</h2>
            <form onSubmit={handleSubmit}>
              <input name="site" value={form.site} onChange={handleChange} placeholder="Dive Site 예: Moalboal" />
              <input name="date" value={form.date} onChange={handleChange} type="date" />
              <div className="form-grid">
                <input name="depth" value={form.depth} onChange={handleChange} placeholder="최대수심 m" />
                <input name="time" value={form.time} onChange={handleChange} placeholder="시간 min" />
                <input name="temp" value={form.temp} onChange={handleChange} placeholder="수온 °C" />
                <select name="type" value={form.type} onChange={handleChange}>
                  <option>Fun Dive</option>
                  <option>Deep</option>
                  <option>Night</option>
                  <option>Drift</option>
                  <option>Training</option>
                  <option>Photo</option>
                </select>
              </div>
              <textarea name="memo" value={form.memo} onChange={handleChange} placeholder="본 생물, 컨디션, 장비 이슈, 느낌 등을 기록하세요." />
              <button type="submit">로그 추가하기</button>
            </form>
            <p className="notice">현재 입력 데이터는 브라우저 화면에서만 임시 반영됩니다. 다음 단계에서 DB 저장을 붙이면 영구 저장됩니다.</p>
          </section>

          <section id="logs" className="log-panel">
            <span>Recent Dive Logs</span>
            <h2>최근 로그</h2>
            <div className="log-list">
              {logs.map((log, index) => (
                <article className="log-card" key={`${log.site}-${index}`}>
                  <div>
                    <h3>{log.site}</h3>
                    <p>{log.date} · {log.type}</p>
                    <small>{log.memo}</small>
                  </div>
                  <div className="log-metrics">
                    <span><Gauge size={15} /> {log.depth}</span>
                    <span><Clock3 size={15} /> {log.time}</span>
                    <span><Thermometer size={15} /> {log.temp}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="photo-section">
          <div>
            <span>Favorite Moments</span>
            <h2>사진 갤러리</h2>
          </div>
          <div className="photo-grid">
            {[
              "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=900&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?q=80&w=900&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?q=80&w=900&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=900&auto=format&fit=crop",
            ].map((src, index) => <img key={src} src={src} alt={`dive memory ${index + 1}`} />)}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
