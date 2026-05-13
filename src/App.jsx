import React, { useEffect, useState } from "react";
import "./index.css";

const emptyForm = {
  date: "",
  location: "",
  diveSite: "",
  diveNumber: "1",
  buddy: "",
  shop: "",
  startTime: "",
  endTime: "",
  surfaceInterval: "",
  maxDepth: "",
  avgDepth: "",
  bottomTime: "",
  waterTemp: "",
  visibility: "",
  current: "",
  wave: "",
  weather: "",
  entryType: "Boat",
  startPressure: "",
  endPressure: "",
  tankType: "Aluminum",
  tankSize: "11L",
  gasType: "Air",
  residualNitrogen: "",
  planFollowed: "yes",
  memo: "",
};

const equipmentItems = [
  ["mask", "마스크"],
  ["snorkel", "스노클"],
  ["fin", "핀"],
  ["bcd", "BCD"],
  ["regulator", "호흡기"],
  ["octopus", "옥토퍼스"],
  ["gauge", "게이지"],
  ["computer", "다이브컴퓨터"],
  ["weight", "웨이트"],
  ["suit", "슈트"],
  ["smb", "SMB"],
  ["camera", "카메라"],
];

const planItems = [
  ["depthPlan", "계획 수심 준수"],
  ["timePlan", "계획 시간 준수"],
  ["ndlCheck", "무감압 한계 확인"],
  ["safetyStop", "안전정지 수행"],
  ["buddyCheck", "버디 체크"],
  ["surfaceIntervalCheck", "수면 휴식시간 확인"],
  ["residualNitrogenCheck", "잔류질소 확인"],
  ["computerCheck", "다이브컴퓨터 확인"],
];

const defaultChecklist = (items) =>
  Object.fromEntries(items.map(([key]) => [key, false]));

export default function App() {
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [equipmentChecklist, setEquipmentChecklist] = useState(defaultChecklist(equipmentItems));
  const [planChecklist, setPlanChecklist] = useState(defaultChecklist(planItems));
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [editingLog, setEditingLog] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [keepExistingPhoto, setKeepExistingPhoto] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
    setEquipmentChecklist(defaultChecklist(equipmentItems));
    setPlanChecklist(defaultChecklist(planItems));
    setPhoto(null);
    setPhotoPreview("");
    setEditingLog(null);
    setKeepExistingPhoto(true);
    setShowForm(false);
  };

  const parseJsonObject = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (type, key) => {
    if (type === "equipment") {
      setEquipmentChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    } else {
      setPlanChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    setPhoto(file || null);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");

    if (file) {
      setKeepExistingPhoto(false);
    }
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("log-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setSelectedLog(null);

    setForm({
      date: log.date || "",
      location: log.location || "",
      diveSite: log.diveSite || "",
      diveNumber: log.diveNumber || "1",
      buddy: log.buddy || "",
      shop: log.shop || "",
      startTime: log.startTime || "",
      endTime: log.endTime || "",
      surfaceInterval: log.surfaceInterval || "",
      maxDepth: log.maxDepth || "",
      avgDepth: log.avgDepth || "",
      bottomTime: log.bottomTime || "",
      waterTemp: log.waterTemp || "",
      visibility: log.visibility || "",
      current: log.current || "",
      wave: log.wave || "",
      weather: log.weather || "",
      entryType: log.entryType || "Boat",
      startPressure: log.startPressure || "",
      endPressure: log.endPressure || "",
      tankType: log.tankType || "Aluminum",
      tankSize: log.tankSize || "11L",
      gasType: log.gasType || "Air",
      residualNitrogen: log.residualNitrogen || "",
      planFollowed: log.planFollowed || "yes",
      memo: log.memo || "",
    });

    setEquipmentChecklist(
      parseJsonObject(log.equipmentChecklist, defaultChecklist(equipmentItems))
    );
    setPlanChecklist(parseJsonObject(log.planChecklist, defaultChecklist(planItems)));
    setPhoto(null);
    setPhotoPreview(log.photoUrl || "");
    setKeepExistingPhoto(true);
    setShowForm(true);
    setMessage("수정 모드입니다.");

    setTimeout(() => {
      document.getElementById("log-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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

      formData.append("equipmentChecklist", JSON.stringify(equipmentChecklist));
      formData.append("planChecklist", JSON.stringify(planChecklist));

      if (photo) {
        formData.append("photo", photo);
      }

      if (editingLog) {
        formData.append("keepExistingPhoto", keepExistingPhoto ? "true" : "false");

        const response = await fetch(`/api/logs/${editingLog.rowKey}`, {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) throw new Error("update failed");
        setMessage("다이빙 로그가 수정되었습니다.");
      } else {
        const response = await fetch("/api/logs", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("save failed");
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

      if (!response.ok) throw new Error("delete failed");

      if (editingLog?.rowKey === log.rowKey) resetForm();
      if (selectedLog?.rowKey === log.rowKey) setSelectedLog(null);

      await loadLogs();
    } catch {
      setMessage("삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const calcAirUsed = (log) => {
    const start = Number(log.startPressure);
    const end = Number(log.endPressure);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "-";
    return `${start - end} bar`;
  };

  return (
    <main className="page">
      <section className="hero-simple">
        <p className="eyebrow">SCUBA DIVING LOGBOOK</p>
        <h1>스쿠버다이빙 로그북</h1>
        <p className="hero-description">
          다이빙 기록, 사진, 장비 체크, 잔압, 수면휴식, 계획 준수 여부를 관리합니다.
        </p>
        <button type="button" className="main-action" onClick={openNewForm}>
          새 로그 기록 만들기
        </button>
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
          <div className="empty-state">등록된 로그가 없습니다.</div>
        ) : (
          <div className="log-list-simple">
            {logs.map((log) => (
              <article className="log-item" key={log.rowKey}>
                {log.photoUrl && (
                  <img className="log-photo-large" src={log.photoUrl} alt={log.diveSite} />
                )}

                <div className="log-detail">
                  <strong>{log.diveSite}</strong>
                  <p>
                    {log.date} · {log.location} · {log.diveNumber || "1"}회차
                  </p>
                  <span>
                    최대수심 {log.maxDepth || "-"}m · 시간 {log.bottomTime || "-"}min ·
                    수온 {log.waterTemp || "-"}°C
                  </span>
                  {log.memo && <small>{log.memo}</small>}
                </div>

                <div className="log-actions">
                  <button className="detail-button" onClick={() => setSelectedLog(log)}>
                    상세보기
                  </button>
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

      {selectedLog && (
        <section className="panel detail-panel">
          <div className="section-title row-title">
            <div>
              <p>DETAIL</p>
              <h2>{selectedLog.diveSite}</h2>
            </div>
            <button className="small-button" onClick={() => setSelectedLog(null)}>
              닫기
            </button>
          </div>

          {selectedLog.photoUrl && (
            <img className="detail-photo" src={selectedLog.photoUrl} alt={selectedLog.diveSite} />
          )}

          <div className="detail-grid">
            <Info label="날짜" value={selectedLog.date} />
            <Info label="지역" value={selectedLog.location} />
            <Info label="회차" value={`${selectedLog.diveNumber || "1"}회차`} />
            <Info label="버디" value={selectedLog.buddy} />
            <Info label="다이브샵" value={selectedLog.shop} />
            <Info label="입수방식" value={selectedLog.entryType} />
            <Info label="시작시간" value={selectedLog.startTime} />
            <Info label="종료시간" value={selectedLog.endTime} />
            <Info label="수면휴식" value={selectedLog.surfaceInterval} />
            <Info label="최대수심" value={`${selectedLog.maxDepth || "-"}m`} />
            <Info label="평균수심" value={`${selectedLog.avgDepth || "-"}m`} />
            <Info label="다이빙 시간" value={`${selectedLog.bottomTime || "-"}min`} />
            <Info label="시작 잔압" value={`${selectedLog.startPressure || "-"}bar`} />
            <Info label="종료 잔압" value={`${selectedLog.endPressure || "-"}bar`} />
            <Info label="사용 잔압" value={calcAirUsed(selectedLog)} />
            <Info label="탱크" value={`${selectedLog.tankType || "-"} / ${selectedLog.tankSize || "-"}`} />
            <Info label="기체" value={selectedLog.gasType} />
            <Info label="수온" value={`${selectedLog.waterTemp || "-"}°C`} />
            <Info label="시야" value={selectedLog.visibility} />
            <Info label="조류" value={selectedLog.current} />
            <Info label="파도" value={selectedLog.wave} />
            <Info label="날씨" value={selectedLog.weather} />
            <Info label="잔류질소" value={selectedLog.residualNitrogen} />
            <Info label="계획 준수" value={selectedLog.planFollowed === "yes" ? "준수" : "미준수/확인 필요"} />
          </div>

          <ChecklistView
            title="장비 체크"
            items={equipmentItems}
            values={parseJsonObject(selectedLog.equipmentChecklist, {})}
          />

          <ChecklistView
            title="다이빙 계획 체크"
            items={planItems}
            values={parseJsonObject(selectedLog.planChecklist, {})}
          />

          {selectedLog.memo && (
            <div className="memo-box">
              <h3>메모</h3>
              <p>{selectedLog.memo}</p>
            </div>
          )}
        </section>
      )}

      {showForm && (
        <section id="log-form" className="panel">
          <div className="section-title row-title">
            <div>
              <p>{editingLog ? "EDIT LOG" : "NEW LOG"}</p>
              <h2>{editingLog ? "다이빙 로그 수정" : "다이빙 로그 등록"}</h2>
            </div>
            <button type="button" className="small-button" onClick={resetForm}>
              닫기
            </button>
          </div>

          <form className="log-form" onSubmit={handleSubmit}>
            <h3 className="form-subtitle">기본 정보</h3>
            <div className="form-grid">
              <Field label="날짜 *" type="date" name="date" value={form.date} onChange={handleChange} />
              <Field label="지역 *" name="location" value={form.location} onChange={handleChange} placeholder="예: 세부" />
              <Field label="다이빙 포인트 *" name="diveSite" value={form.diveSite} onChange={handleChange} />
              <SelectField label="다이빙 회차" name="diveNumber" value={form.diveNumber} onChange={handleChange} options={["1", "2", "3", "4"]} />
              <Field label="버디" name="buddy" value={form.buddy} onChange={handleChange} />
              <Field label="다이브샵" name="shop" value={form.shop} onChange={handleChange} />
            </div>

            <h3 className="form-subtitle">시간 / 수면휴식</h3>
            <div className="form-grid">
              <Field label="시작 시간" type="time" name="startTime" value={form.startTime} onChange={handleChange} />
              <Field label="종료 시간" type="time" name="endTime" value={form.endTime} onChange={handleChange} />
              <Field label="다이빙 시간(min)" name="bottomTime" value={form.bottomTime} onChange={handleChange} />
              <Field label="수면 휴식시간" name="surfaceInterval" value={form.surfaceInterval} onChange={handleChange} placeholder="예: 1시간 20분" />
            </div>

            <h3 className="form-subtitle">수심 / 환경</h3>
            <div className="form-grid">
              <Field label="최대 수심(m)" name="maxDepth" value={form.maxDepth} onChange={handleChange} />
              <Field label="평균 수심(m)" name="avgDepth" value={form.avgDepth} onChange={handleChange} />
              <Field label="수온(°C)" name="waterTemp" value={form.waterTemp} onChange={handleChange} />
              <Field label="시야" name="visibility" value={form.visibility} onChange={handleChange} />
              <Field label="조류" name="current" value={form.current} onChange={handleChange} placeholder="없음/약함/강함" />
              <Field label="파도" name="wave" value={form.wave} onChange={handleChange} />
              <Field label="날씨" name="weather" value={form.weather} onChange={handleChange} />
              <SelectField label="입수방식" name="entryType" value={form.entryType} onChange={handleChange} options={["Boat", "Shore"]} />
            </div>

            <h3 className="form-subtitle">공기통 / 기체</h3>
            <div className="form-grid">
              <Field label="시작 잔압(bar)" name="startPressure" value={form.startPressure} onChange={handleChange} />
              <Field label="종료 잔압(bar)" name="endPressure" value={form.endPressure} onChange={handleChange} />
              <SelectField label="탱크 종류" name="tankType" value={form.tankType} onChange={handleChange} options={["Aluminum", "Steel"]} />
              <SelectField label="탱크 용량" name="tankSize" value={form.tankSize} onChange={handleChange} options={["10L", "11L", "12L", "15L", "기타"]} />
              <SelectField label="기체" name="gasType" value={form.gasType} onChange={handleChange} options={["Air", "Nitrox", "기타"]} />
              <Field label="잔류질소/압력그룹" name="residualNitrogen" value={form.residualNitrogen} onChange={handleChange} />
            </div>

            <h3 className="form-subtitle">장비 체크</h3>
            <CheckboxGrid items={equipmentItems} values={equipmentChecklist} onChange={(key) => handleChecklistChange("equipment", key)} />

            <h3 className="form-subtitle">다이빙 계획 체크</h3>
            <div className="form-grid">
              <SelectField label="전체 계획 준수 여부" name="planFollowed" value={form.planFollowed} onChange={handleChange} options={[
                ["yes", "준수"],
                ["no", "미준수/확인 필요"],
              ]} />
            </div>
            <CheckboxGrid items={planItems} values={planChecklist} onChange={(key) => handleChecklistChange("plan", key)} />

            <h3 className="form-subtitle">사진 / 메모</h3>
            <label>
              사진 {editingLog ? "(새 사진을 선택하면 교체됩니다)" : ""}
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
            </label>

            {photoPreview && (
              <div className="photo-preview">
                <img src={photoPreview} alt="미리보기" />
              </div>
            )}

            <label>
              메모
              <textarea name="memo" value={form.memo} onChange={handleChange} placeholder="다이빙 메모" />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "처리 중..." : editingLog ? "수정 저장" : "DB에 저장"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}
        </section>
      )}
    </main>
  );
}

function Field({ label, ...props }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <label>
      {label}
      <select name={name} value={value} onChange={onChange}>
        {options.map((option) => {
          const val = Array.isArray(option) ? option[0] : option;
          const text = Array.isArray(option) ? option[1] : option;
          return (
            <option key={val} value={val}>
              {text}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function CheckboxGrid({ items, values, onChange }) {
  return (
    <div className="checkbox-grid">
      {items.map(([key, label]) => (
        <label className="check-item" key={key}>
          <input type="checkbox" checked={!!values[key]} onChange={() => onChange(key)} />
          {label}
        </label>
      ))}
    </div>
  );
}

function ChecklistView({ title, items, values }) {
  return (
    <div className="check-view">
      <h3>{title}</h3>
      <div className="check-view-grid">
        {items.map(([key, label]) => (
          <span className={values[key] ? "checked" : ""} key={key}>
            {values[key] ? "✓" : "—"} {label}
          </span>
        ))}
      </div>
    </div>
  );
}