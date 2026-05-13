import React, { useEffect, useState } from "react";
import "./index.css";

const emptyForm = {
  date: "",
  location: "",
  diveSite: "",
  maxDepth: "",
  bottomTime: "",
  waterTemp: "",
  visibility: "",
  buddy: "",
  memo: "",
};

export default function App() {
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/logs");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      setMessage("로그 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.date || !form.location || !form.diveSite) {
      setMessage("날짜, 지역, 다이빙 포인트는 필수입니다.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("save failed");
      }

      setForm(emptyForm);
      setMessage("다이빙 로그가 저장되었습니다.");
      await loadLogs();
    } catch (error) {
      setMessage("저장에 실패했습니다. DB 연결 설정을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (log) => {
    if (!confirm("이 로그를 삭제할까요?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/logs/${log.rowKey}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("delete failed");
      }

      await loadLogs();
    } catch (error) {
      setMessage("삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="hero-simple">
        <div>
          <p className="eyebrow">SCUBA DIVING LOGBOOK</p>
          <h1>스쿠버다이빙 로그북</h1>
          <p className="hero-description">
            다이빙 날짜, 지역, 포인트, 수심, 수온, 버디와 메모를 등록하고 이력을 확인합니다.
          </p>
        </div>
        <a href="#new-log" className="main-action">새 로그 기록 만들기</a>
      </section>

      <section id="new-log" className="panel">
        <div className="section-title">
          <p>NEW LOG</p>
          <h2>다이빙 로그 등록</h2>
        </div>

        <form className="log-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              날짜 *
              <input type="date" name="date" value={form.date} onChange={handleChange} />
            </label>
            <label>
              지역 *
              <input name="location" value={form.location} onChange={handleChange} placeholder="예: 세부, 제주, 오키나와" />
            </label>
            <label>
              다이빙 포인트 *
              <input name="diveSite" value={form.diveSite} onChange={handleChange} placeholder="예: Moalboal Sardine Run" />
            </label>
            <label>
              최대 수심(m)
              <input name="maxDepth" value={form.maxDepth} onChange={handleChange} placeholder="예: 28" />
            </label>
            <label>
              다이빙 시간(min)
              <input name="bottomTime" value={form.bottomTime} onChange={handleChange} placeholder="예: 47" />
            </label>
            <label>
              수온(°C)
              <input name="waterTemp" value={form.waterTemp} onChange={handleChange} placeholder="예: 27" />
            </label>
            <label>
              시야
              <input name="visibility" value={form.visibility} onChange={handleChange} placeholder="예: 좋음, 15m" />
            </label>
            <label>
              버디
              <input name="buddy" value={form.buddy} onChange={handleChange} placeholder="예: 홍길동" />
            </label>
          </div>

          <label>
            메모
            <textarea name="memo" value={form.memo} onChange={handleChange} placeholder="본 생물, 컨디션, 장비 이슈, 느낌 등을 기록하세요." />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "처리 중..." : "DB에 저장"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </section>

      <section className="panel">
        <div className="section-title row-title">
          <div>
            <p>LOG HISTORY</p>
            <h2>등록한 로그 이력</h2>
          </div>
          <button className="small-button" onClick={loadLogs} disabled={loading}>새로고침</button>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">등록된 로그가 없습니다. 첫 로그를 등록해보세요.</div>
        ) : (
          <div className="log-list-simple">
            {logs.map((log) => (
              <article className="log-item" key={log.rowKey}>
                <div>
                  <strong>{log.diveSite}</strong>
                  <p>{log.date} · {log.location}</p>
                  <span>
                    최대수심 {log.maxDepth || "-"}m · 시간 {log.bottomTime || "-"}min · 수온 {log.waterTemp || "-"}°C
                  </span>
                  {log.memo && <small>{log.memo}</small>}
                </div>
                <button className="delete-button" onClick={() => handleDelete(log)}>삭제</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
