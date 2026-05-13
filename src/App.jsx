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
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [editingLog, setEditingLog] = useState(null);
  const [keepExistingPhoto, setKeepExistingPhoto] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/logs");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch {
      setMessage("로그 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setPhoto(null);
    setPhotoPreview("");
    setEditingLog(null);
    setKeepExistingPhoto(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    setPhoto(file || null);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");

    if (file) {
      setKeepExistingPhoto(false);
    }
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setForm({
      date: log.date || "",
      location: log.location || "",
      diveSite: log.diveSite || "",
      maxDepth: log.maxDepth || "",
      bottomTime: log.bottomTime || "",
      waterTemp: log.waterTemp || "",
      visibility: log.visibility || "",
      buddy: log.buddy || "",
      memo: log.memo || "",
    });
    setPhoto(null);
    setPhotoPreview(log.photoUrl || "");
    setKeepExistingPhoto(true);
    setMessage("수정 모드입니다. 내용을 변경한 뒤 수정 저장을 누르세요.");

    document.getElementById("new-log")?.scrollIntoView({ behavior: "smooth" });
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
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (photo) {
        formData.append("photo", photo);
      }

      if (editingLog) {
        formData.append("keepExistingPhoto", keepExistingPhoto ? "true" : "false");

        const response = await fetch(`/api/logs/${editingLog.rowKey}`, {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("update failed");
        }

        setMessage("다이빙 로그가 수정되었습니다.");
      } else {
        const response = await fetch("/api/logs", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("save failed");
        }

        setMessage("다이빙 로그가 저장되었습니다.");
      }

      resetForm();
      await loadLogs();
    } catch {
      setMessage("저장에 실패했습니다. DB 또는 Blob 설정을 확인해주세요.");
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

      if (editingLog?.rowKey === log.rowKey) {
        resetForm();
      }

      await loadLogs();
    } catch {
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
            다이빙 날짜, 지역, 포인트, 수심, 수온, 사진과 메모를 등록하고 이력을 확인합니다.
          </p>
        </div>

        <a href="#new-log" className="main-action">
          새 로그 기록 만들기
        </a>
      </section>

      <section id="new-log" className="panel">
        <div className="section-title row-title">
          <div>
            <p>{editingLog ? "EDIT LOG" : "NEW LOG"}</p>
            <h2>{editingLog ? "다이빙 로그 수정" : "다이빙 로그 등록"}</h2>
          </div>

          {editingLog && (
            <button type="button" className="small-button" onClick={resetForm}>
              수정 취소
            </button>
          )}
        </div>

        <form className="log-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              날짜 *
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </label>

            <label>
              지역 *
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="예: 세부, 제주, 오키나와"
              />
            </label>

            <label>
              다이빙 포인트 *
              <input
                name="diveSite"
                value={form.diveSite}
                onChange={handleChange}
                placeholder="예: Moalboal Sardine Run"
              />
            </label>

            <label>
              최대 수심(m)
              <input
                name="maxDepth"
                value={form.maxDepth}
                onChange={handleChange}
                placeholder="예: 28"
              />
            </label>

            <label>
              다이빙 시간(min)
              <input
                name="bottomTime"
                value={form.bottomTime}
                onChange={handleChange}
                placeholder="예: 47"
              />
            </label>

            <label>
              수온(°C)
              <input
                name="waterTemp"
                value={form.waterTemp}
                onChange={handleChange}
                placeholder="예: 27"
              />
            </label>

            <label>
              시야
              <input
                name="visibility"
                value={form.visibility}
                onChange={handleChange}
                placeholder="예: 좋음, 15m"
              />
            </label>

            <label>
              버디
              <input
                name="buddy"
                value={form.buddy}
                onChange={handleChange}
                placeholder="예: 홍길동"
              />
            </label>
          </div>

          <label>
            사진 {editingLog ? "(새 사진을 선택하면 교체됩니다)" : ""}
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>

          {photoPreview && (
            <div className="photo-preview">
              <img src={photoPreview} alt="다이빙 사진 미리보기" />

              {editingLog && !photo && (
                <p className="photo-help">기존 사진을 유지합니다.</p>
              )}

              {photo && <p className="photo-help">새 사진으로 교체됩니다.</p>}
            </div>
          )}

          <label>
            메모
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
              placeholder="본 생물, 컨디션, 장비 이슈, 느낌 등을 기록하세요."
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading
              ? "처리 중..."
              : editingLog
              ? "수정 저장"
              : "DB에 저장"}
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

          <button className="small-button" onClick={loadLogs} disabled={loading}>
            새로고침
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            등록된 로그가 없습니다. 첫 로그를 등록해보세요.
          </div>
        ) : (
          <div className="log-list-simple">
            {logs.map((log) => (
              <article className="log-item" key={log.rowKey}>
                {log.photoUrl && (
                  <img
                    className="log-photo"
                    src={log.photoUrl}
                    alt={`${log.diveSite} 다이빙 사진`}
                  />
                )}

                <div className="log-detail">
                  <strong>{log.diveSite}</strong>
                  <p>
                    {log.date} · {log.location}
                  </p>
                  <span>
                    최대수심 {log.maxDepth || "-"}m · 시간{" "}
                    {log.bottomTime || "-"}min · 수온 {log.waterTemp || "-"}°C
                  </span>

                  {log.visibility && <span>시야 {log.visibility}</span>}
                  {log.buddy && <span>버디 {log.buddy}</span>}
                  {log.memo && <small>{log.memo}</small>}
                </div>

                <div className="log-actions">
                  <button className="edit-button" onClick={() => handleEdit(log)}>
                    수정
                  </button>
                  <button className="delete-button" onClick={() => handleDelete(log)}>
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}