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
  isPublic: "true",
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
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pageProfile, setPageProfile] = useState(null);
  const [isOwnerPage, setIsOwnerPage] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [equipmentChecklist, setEquipmentChecklist] = useState(
    defaultChecklist(equipmentItems)
  );
  const [planChecklist, setPlanChecklist] = useState(
    defaultChecklist(planItems)
  );
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [editingLog, setEditingLog] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [keepExistingPhoto, setKeepExistingPhoto] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [feed, setFeed] = useState([]);
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("강릉");

  const currentPath = window.location.pathname;
  const userPageMatch = currentPath.match(/^\/u\/([^/]+)$/);
  const isUserPage = !!userPageMatch;
  const isMePage = currentPath === "/me";
  const isHomePage = currentPath === "/";
  const isEmergencyPage = currentPath === "/emergency";

  const parseJsonObject = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const loadMe = async () => {
    try {
      const response = await fetch("/api/me");
      const data = await response.json();
      setMe(data);
      setProfile(data.profile || null);
    } catch {
      setMe({ authenticated: false });
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
  };

  const loadFeed = async () => {
    try {
      const response = await fetch("/api/feed");
      const data = await response.json();
      setFeed(data.logs || []);
    } catch {
      setFeed([]);
    }
  };

  const loadLogs = async () => {
    setLoading(true);

    try {
      let response;

      if (isUserPage) {
        const slug = userPageMatch[1];
        response = await fetch(`/api/users/${slug}/logs`);
      } else {
        response = await fetch("/api/logs");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "load failed");
      }

      setLogs(data.logs || []);
      setPageProfile(data.profile || null);
      setIsOwnerPage(!!data.isOwner);
    } catch {
      setLogs([]);
      setMessage("로그 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    loadUsers();
    loadFeed();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        () => setGeo(null)
      );
    }

    if (isHomePage || isEmergencyPage) {
      setLogs([]);
    } else {
      loadLogs();
    }
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

  const openNewForm = () => {
    if (!me?.authenticated) {
      window.location.href = "/.auth/login/google";
      return;
    }

    resetForm();
    setShowForm(true);

    setTimeout(() => {
      document.getElementById("log-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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

  const checkAllEquipment = () => {
    setEquipmentChecklist(
      Object.fromEntries(equipmentItems.map(([key]) => [key, true]))
    );
  };

  const uncheckAllEquipment = () => {
    setEquipmentChecklist(
      Object.fromEntries(equipmentItems.map(([key]) => [key, false]))
    );
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
      isPublic: log.isPublic ? "true" : "false",
      memo: log.memo || "",
    });

    setEquipmentChecklist(
      parseJsonObject(log.equipmentChecklist, defaultChecklist(equipmentItems))
    );
    setPlanChecklist(
      parseJsonObject(log.planChecklist, defaultChecklist(planItems))
    );
    setPhoto(null);
    setPhotoPreview(log.photoUrl || "");
    setKeepExistingPhoto(true);
    setShowForm(true);
    setMessage("수정 모드입니다.");

    setTimeout(() => {
      document.getElementById("log-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const refreshCurrentPage = async () => {
    await loadMe();
    await loadUsers();
    await loadFeed();

    if (!isHomePage && !isEmergencyPage) {
      await loadLogs();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!me?.authenticated) {
      setMessage("로그인이 필요합니다.");
      return;
    }

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
        formData.append(
          "keepExistingPhoto",
          keepExistingPhoto ? "true" : "false"
        );

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
      await refreshCurrentPage();
    } catch {
      setMessage("저장에 실패했습니다. 로그인, DB 또는 Blob 설정을 확인해주세요.");
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

      await refreshCurrentPage();
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

  const canManage = !isUserPage || isOwnerPage;

  const pageTitle = isUserPage
    ? `${pageProfile?.displayName || userPageMatch?.[1] || ""} 로그북`
    : isMePage
    ? "내 다이빙 로그북"
    : "Dive Community";

  const listLogs = isHomePage ? feed : logs;

  if (isEmergencyPage) {
    return (
      <main className="page">
        <TopNav me={me} />
        <EmergencyPage />
      </main>
    );
  }

  return (
    <main className="page">
      <TopNav me={me} />

      <section className="hero-simple">
        <p className="eyebrow">SCUBA DIVING LOGBOOK</p>
        <h1>{pageTitle}</h1>
        <p className="hero-description">
          다이빙 기록, 사진, 장비 체크, 잔압, 수면휴식, 계획 준수 여부를 관리합니다.
        </p>

        <div className="auth-box">
          {me?.authenticated ? (
            <>
              <span>{me.user?.userEmail} 로그인됨</span>
              <a className="small-button" href="/me">내 로그북</a>
              {me.myUrl && <a className="small-button" href={me.myUrl}>내 공개 페이지</a>}
            </>
          ) : (
            <>
              <span>비로그인 Viewer 모드입니다.</span>
              <a className="small-button" href="/.auth/login/google">Google 로그인</a>
            </>
          )}
        </div>

        {!isHomePage && canManage && (
          <button type="button" className="main-action" onClick={openNewForm}>
            새 로그 기록 만들기
          </button>
        )}
      </section>

      {isHomePage && (
        <>
          <section className="community-hero">
            <div className="community-copy">
              <p className="eyebrow">DIVE COMMUNITY</p>
              <h2>오늘의 다이빙을 준비하세요</h2>
              <p>
                날씨, 바다 수온, 응급 절차, 반복다이빙 표를 확인하고
                다른 다이버들의 공개 로그북을 둘러볼 수 있습니다.
              </p>
            </div>

            <div className="community-map">
              {geo ? (
                <iframe
                  title="현재 위치 지도"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${geo.lon - 0.8},${geo.lat - 0.8},${geo.lon + 0.8},${geo.lat + 0.8}&layer=mapnik&marker=${geo.lat},${geo.lon}`}
                />
              ) : (
                <div className="map-placeholder">
                  <strong>위치 권한을 허용하면</strong>
                  <span>현재 위치 기반 지도가 표시됩니다.</span>
                </div>
              )}
            </div>
          </section>

          <section className="quick-links">
            <a className="quick-card primary-card" href="/me">
              <div className="quick-icon">📘</div>
              <strong>내 로그북</strong>
              <span>로그인 후 내 다이빙 기록 관리</span>
            </a>

            <MiniWeatherCard
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
            />

            <MiniWaterTempCard selectedRegion={selectedRegion} />

            <a className="quick-card" href="/emergency">
              <div className="quick-icon">🚨</div>
              <strong>응급 절차</strong>
              <span>다이빙 응급상황 대응 가이드</span>
            </a>
          </section>

          {/* <WaterTemperaturePanel /> */}

          <section id="dive-tables" className="panel">
            <DivePlanner />
          </section>

          <section className="safety-strip">
            <div>
              <strong>📋 계획된 다이빙</strong>
              <span>다이빙 계획을 세우고 버디와 공유하세요.</span>
            </div>

            <div>
              <strong>🤝 버디 시스템</strong>
              <span>항상 버디와 함께 다이빙하세요.</span>
            </div>

            <div>
              <strong>🛑 안전 정지</strong>
              <span>5m에서 3~5분 안전정지를 하세요.</span>
            </div>

            <div>
              <strong>⬆️ 천천히 상승</strong>
              <span>분당 9m 이내로 천천히 상승하세요.</span>
            </div>

            <div>
              <strong>💧 수분 섭취</strong>
              <span>충분한 수분 섭취로 감압병을 예방하세요.</span>
            </div>

            <div>
              <strong>❤️ 컨디션 체크</strong>
              <span>건강한 상태에서만 다이빙하세요.</span>
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <p>RECOMMENDED DIVERS</p>
              <h2>추천 로그북</h2>
            </div>


            {users.length === 0 ? (
              <div className="empty-state">공개된 사용자가 없습니다.</div>
            ) : (
              <div className="user-grid">
                {users.map((user) => (
                  <a className="user-card" key={user.slug} href={`/u/${user.slug}`}>
                    <strong>{user.displayName || user.slug}</strong>
                    <span>/u/{user.slug}</span>
                    {user.bio && <small>{user.bio}</small>}
                  </a>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="panel">
        <div className="section-title row-title">
          <div>
            <p>{isHomePage ? "PUBLIC FEED" : "LOG HISTORY"}</p>
            <h2>{isHomePage ? "최근 공개 다이빙 로그" : "등록한 로그 이력"}</h2>
          </div>
          <button className="small-button" onClick={isHomePage ? loadFeed : loadLogs} disabled={loading}>
            새로고침
          </button>
        </div>

        {listLogs.length === 0 ? (
          <div className="empty-state">
            {isUserPage && !isOwnerPage
              ? "공개된 로그가 없습니다."
              : "등록된 로그가 없습니다."}
          </div>
        ) : (
          <div className="log-list-simple">
            {listLogs.map((log) => (
              <article className="log-item" key={log.rowKey}>
                {log.photoUrl && (
                  <img className="log-photo-large" src={log.photoUrl} alt={log.diveSite} />
                )}

                <div className="log-detail">
                  <strong>{log.diveSite}</strong>
                  <p>
                    {log.date} · {log.location} · {log.diveNumber || "1"}회차
                  </p>
                  {isHomePage && log.userSlug && (
                    <p>
                      by <a className="inline-link" href={`/u/${log.userSlug}`}>{log.userName || log.userSlug}</a>
                    </p>
                  )}
                  <span>
                    최대수심 {log.maxDepth || "-"}m · 시간 {log.bottomTime || "-"}min · 수온 {log.waterTemp || "-"}°C
                  </span>
                  <span>{log.isPublic ? "공개 로그" : "비공개 로그"}</span>
                  {log.memo && <small>{log.memo}</small>}
                </div>

                <div className="log-actions">
                  <button className="detail-button" onClick={() => setSelectedLog(log)}>상세보기</button>
                  {canManage && (
                    <>
                      <button className="edit-button" onClick={() => handleEdit(log)}>수정</button>
                      <button className="delete-button" onClick={() => handleDelete(log)}>삭제</button>
                    </>
                  )}
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
            <button className="small-button" onClick={() => setSelectedLog(null)}>닫기</button>
          </div>

          {selectedLog.photoUrl && (
            <img className="detail-photo" src={selectedLog.photoUrl} alt={selectedLog.diveSite} />
          )}

          <div className="detail-grid">
            <Info label="공개 여부" value={selectedLog.isPublic ? "공개" : "비공개"} />
            <Info label="작성자" value={selectedLog.userName || selectedLog.userEmail} />
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
            <button type="button" className="small-button" onClick={resetForm}>닫기</button>
          </div>

          <form className="log-form" onSubmit={handleSubmit}>
            <h3 className="form-subtitle">공개 설정</h3>
            <label className="check-item">
              <input
                type="checkbox"
                checked={form.isPublic === "true"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isPublic: e.target.checked ? "true" : "false",
                  }))
                }
              />
              공개 로그로 공유
            </label>

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
            <div className="check-toolbar">
              <button type="button" className="small-button" onClick={checkAllEquipment}>장비 전체 체크</button>
              <button type="button" className="small-button" onClick={uncheckAllEquipment}>장비 전체 해제</button>
            </div>
            <CheckboxGrid items={equipmentItems} values={equipmentChecklist} onChange={(key) => handleChecklistChange("equipment", key)} />

            <h3 className="form-subtitle">다이빙 계획 체크</h3>
            <div className="form-grid">
              <SelectField
                label="전체 계획 준수 여부"
                name="planFollowed"
                value={form.planFollowed}
                onChange={handleChange}
                options={[
                  ["yes", "준수"],
                  ["no", "미준수/확인 필요"],
                ]}
              />
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

      {message && !showForm && <p className="message">{message}</p>}

      <footer className="footer">
        © 2026 Grabits Dive Community. All rights reserved.
      </footer>

    </main>
  );
}

function TopNav({ me }) {
  return (
    <section className="top-nav">
      <a href="/" className="brand-logo">
        <span>🤿</span>
        <div>
          <strong>SCUBA LOGBOOK</strong>
          <small>DIVE COMMUNITY</small>
        </div>
      </a>

      <div className="top-menu">
        <a href="/">홈</a>
        <a href="/me">내 로그북</a>
        <a href="/emergency">응급 절차</a>
        <a href="/#dive-tables">다이빙 표</a>
      </div>

      <div className="top-auth">
        {me?.authenticated ? (
          <>
            <span>{me.user?.userEmail}</span>
            <a className="small-button" href="/.auth/logout">로그아웃</a>
          </>
        ) : (
          <a className="small-button" href="/.auth/login/google">로그인</a>
        )}
      </div>
    </section>
  );
}

function EmergencyPage() {
  const emergencyItems = [
    {
      icon: "🫧",
      title: "감압병 응급처치",
      steps: [
        "100% 산소 공급",
        "수평 자세 유지",
        "수분 공급 (의식이 있을 때)",
        "즉시 의료기관 이송",
        "다이빙 로그 준비",
      ],
    },
    {
      icon: "🛟",
      title: "익수자 구조",
      steps: [
        "자신의 안전 먼저 확보",
        "구조 장비 활용",
        "수면으로 상승 (천천히)",
        "BCD 팽창 및 웨이트 제거",
        "CPR 준비 (필요시)",
      ],
    },
    {
      icon: "🆘",
      title: "의식불명 다이버",
      steps: [
        "기도 확보",
        "호흡 확인",
        "맥박 확인",
        "CPR 시작 (필요시)",
        "응급 구조 요청",
      ],
    },
    {
      icon: "😰",
      title: "과호흡/패닉",
      steps: [
        "다이버 진정시키기",
        "눈 맞춤 유지",
        "천천히 깊게 호흡 유도",
        "안전한 곳으로 이동",
        "버디와 함께 상승",
      ],
    },
  ];

  return (
    <main className="emergency-page-light">
      <section className="emergency-light-header">
        <a href="/" className="emergency-back">← 홈으로</a>
        <h1>다이빙 응급 가이드</h1>
        <p>긴급 연락처와 상황별 응급처치 절차를 빠르게 확인하세요.</p>
      </section>

      <section className="emergency-light-section">
        <h2>📞 긴급 연락처</h2>

        <div className="emergency-contact-grid">
          <EmergencyContactCard
            icon="🚤"
            title="해양경찰"
            number="122"
            desc="해상 긴급구조"
          />

          <EmergencyContactCard
            icon="🚑"
            title="응급의료센터"
            number="119"
            desc="의료 응급상황"
          />

          <EmergencyContactCard
            icon="🏥"
            title="가까운 병원"
            number="1339"
            desc="의료상담 및 병원안내"
          />

          <EmergencyContactCard
            icon="☎️"
            title="DAN 핫라인"
            number="+82-10-4500-9113"
            desc="다이빙 의학 상담"
          />
        </div>
      </section>

      <section className="emergency-light-section">
        <h2>〽️ 응급처치 절차</h2>

        <div className="emergency-list">
          {emergencyItems.map((item) => (
            <EmergencyItem
              key={item.title}
              icon={item.icon}
              title={item.title}
              steps={item.steps}
            />
          ))}
        </div>
      </section>

      <section className="emergency-light-warning">
        <strong>주의</strong>
        <p>
          이 내용은 일반적인 참고용입니다. 실제 응급상황에서는 즉시 119/122에
          신고하고 전문 구조 인력과 의료진의 지시를 따르세요.
        </p>
      </section>
    </main>
  );
}

function EmergencyContactCard({ icon, title, number, desc }) {
  return (
    <article className="emergency-contact-card">
      <span className="emergency-contact-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        <strong>{number}</strong>
        <p>{desc}</p>
      </div>
    </article>
  );
}

function EmergencyItem({ icon, title, steps }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="emergency-light-item">
      <button type="button" onClick={() => setOpen(!open)}>
        <span>
          <b>{icon}</b>
          {title}
        </span>
        <strong>{open ? "⌃" : "›"}</strong>
      </button>

      {open && (
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </article>
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
          return <option key={val} value={val}>{text}</option>;
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

const DEPTHS = [12, 15, 18, 21, 24, 27, 30, 33, 36, 40];

const FIRST_DIVE_GROUP_TABLE = [
  { depth: 12, times: [{ max: 25, group: "C" }, { max: 30, group: "D" }, { max: 40, group: "E" }, { max: 50, group: "F" }, { max: 70, group: "G" }] },
  { depth: 15, times: [{ max: 25, group: "D" }, { max: 30, group: "E" }, { max: 40, group: "F" }, { max: 50, group: "G" }, { max: 60, group: "H" }] },
  { depth: 18, times: [{ max: 15, group: "C" }, { max: 25, group: "D" }, { max: 30, group: "F" }, { max: 40, group: "G" }, { max: 50, group: "H" }] },
  { depth: 21, times: [{ max: 10, group: "C" }, { max: 15, group: "D" }, { max: 20, group: "E" }, { max: 30, group: "F" }, { max: 35, group: "G" }, { max: 40, group: "H" }, { max: 45, group: "I" }] },
  { depth: 24, times: [{ max: 10, group: "C" }, { max: 15, group: "D" }, { max: 20, group: "E" }, { max: 25, group: "F" }, { max: 30, group: "G" }, { max: 35, group: "H" }] },
  { depth: 27, times: [{ max: 10, group: "C" }, { max: 12, group: "D" }, { max: 15, group: "E" }, { max: 20, group: "F" }, { max: 25, group: "G" }] },
  { depth: 30, times: [{ max: 7, group: "C" }, { max: 10, group: "D" }, { max: 15, group: "E" }, { max: 20, group: "F" }, { max: 20, group: "F" }, { max: 22, group: "G" }] },
  { depth: 33, times: [{ max: 5, group: "C" }, { max: 10, group: "D" }, { max: 13, group: "E" }, { max: 15, group: "F" }] },
  { depth: 36, times: [{ max: 5, group: "C" }, { max: 10, group: "D" }, { max: 12, group: "E" }] },
  { depth: 40, times: [{ max: 5, group: "D" }, { max: 8, group: "D" }] },
];

const SURFACE_INTERVAL_TABLE = {
  A: [{ min: 10, max: 1440, group: "A" }],
  B: [{ min: 10, max: 200, group: "B" }, { min: 201, max: 1440, group: "A" }],
  C: [{ min: 10, max: 99, group: "C" }, { min: 100, max: 289, group: "B" }, { min: 290, max: 1440, group: "A" }],
  D: [{ min: 10, max: 69, group: "D" }, { min: 70, max: 158, group: "C" }, { min: 159, max: 348, group: "B" }, { min: 349, max: 1440, group: "A" }],
  E: [{ min: 10, max: 54, group: "E" }, { min: 55, max: 117, group: "D" }, { min: 118, max: 204, group: "C" }, { min: 205, max: 394, group: "B" }, { min: 395, max: 1440, group: "A" }],
  F: [{ min: 10, max: 45, group: "F" }, { min: 46, max: 89, group: "E" }, { min: 90, max: 148, group: "D" }, { min: 149, max: 237, group: "C" }, { min: 238, max: 425, group: "B" }, { min: 426, max: 1440, group: "A" }],
  G: [{ min: 10, max: 40, group: "G" }, { min: 41, max: 75, group: "F" }, { min: 76, max: 119, group: "E" }, { min: 120, max: 178, group: "D" }, { min: 179, max: 165, group: "C" }, { min: 166, max: 455, group: "B" }, { min: 456, max: 1440, group: "A" }],
  H: [{ min: 10, max: 36, group: "H" }, { min: 37, max: 66, group: "G" }, { min: 67, max: 101, group: "F" }, { min: 102, max: 143, group: "E" }, { min: 144, max: 200, group: "D" }, { min: 144, max: 289, group: "C" }, { min: 290, max: 479, group: "B" }, { min: 480, max: 1440, group: "B" }],
  I: [{ min: 10, max: 33, group: "I" }, { min: 34, max: 59, group: "H" }, { min: 60, max: 89, group: "G" }, { min: 90, max: 122, group: "F" }, { min: 123, max: 164, group: "E" }, { min: 165, max: 223, group: "D" }, { min: 224, max: 312, group: "C" }, { min: 313, max: 501, group: "B" }, { min: 502, max: 1440, group: "A" }],
 
};

const RNT_AMDT_TABLE = {
  A: { 12: [7, 123], 15: [6, 74], 18: [5, 50], 21: [4, 41], 24: [4, 31], 27: [3, 22], 30: [3, 19], 33: [3, 12], 36: [3, 9], 40: [3, 5] },
  B: { 12: [17, 113], 15: [13, 67], 18: [11, 44], 21: [9, 36], 24: [8, 27], 27: [7, 18], 30: [7, 15], 33: [6, 9], 36: [6, 6], 40: [6, ] },
  C: { 12: [25, 105], 15: [21, 59], 18: [17, 38], 21: [15, 30], 24: [13, 22], 27: [11, 14], 30: [10, 12], 33: [10, 5], 36: [9, ], 40: [8, ] },
  D: { 12: [37, 93], 15: [29, 51], 18: [24, 31], 21: [20, 25], 24: [18, 17], 27: [16, 9], 30: [14, 8], 33: [13, ], 36: [12, ], 40: [11, ] },
  E: { 12: [49, 81], 15: [38, 42], 18: [30, 25], 21: [26, 19], 24: [23, 12], 27: [20, 5], 30: [18, 4], 33: [16, ], 36: [15, ], 40: [13, ] },
  F: { 12: [61, 69], 15: [47, 33], 18: [39, 19], 21: [31, 14], 24: [28, 7], 27: [24, ], 30: [22, ], 33: [20, ], 36: [18, ], 40: [16, ] },
  G: { 12: [73, 57], 15: [56, 24], 18: [44, 11], 21: [37, 8], 24: [32, ], 27: [29, ], 30: [26, ], 33: [24, ], 36: [21, ], 40: [19, ] },
  H: { 12: [87, 43], 15: [66, 14], 18: [52, ], 21: [43, ], 24: [38, ], 27: [33, ], 30: [30, ], 33: [27, ], 36: [25, ], 40: [22, ] },
  I: { 12: [101, 29], 15: [76, 4], 18: [61, ], 21: [50, ], 24: [43, ], 27: [38, ], 30: [34, ], 33: [31, ], 36: [28, ], 40: [25, ] },  
};

function getNextDepth(depth) {
  return DEPTHS.find((d) => Number(depth) <= d) || null;
}

function calculateDivePlan(depth, bottomTime, sit) {
  const roundedDepth = getNextDepth(depth);

  const firstRow = FIRST_DIVE_GROUP_TABLE.find(
    (row) => row.depth === roundedDepth
  );

  let firstGroup = null;

  if (firstRow) {
    for (const t of firstRow.times) {
      if (Number(bottomTime) <= t.max) {
        firstGroup = t.group;
        break;
      }
    }
  }

  const adjustedGroup =
    SURFACE_INTERVAL_TABLE[firstGroup]?.find(
      (row) =>
        Number(sit) >= row.min &&
        Number(sit) <= row.max
    )?.group || firstGroup;

  return {
    roundedDepth,
    firstGroup,
    adjustedGroup,
  };
}

function DivePlanner() {
  const [depth, setDepth] = useState("18");
  const [bottomTime, setBottomTime] = useState("30");
  const [sit, setSit] = useState("60");

  const result = calculateDivePlan(depth, bottomTime, sit);
  const rntRows = result.adjustedGroup
    ? DEPTHS.map((d) => {
        const data = RNT_AMDT_TABLE[result.adjustedGroup]?.[d];
        return { depth: d, rnt: data?.[0] ?? "-", amdt: data?.[1] ?? "-" };
      })
    : [];

  return (
    <>
      <div className="section-title">
        <p>DIVE TABLE CALCULATOR</p>
        <h2>반복다이빙 자동 계산</h2>
      </div>

      <div className="planner-grid">
        <div className="planner-inline-row">
          <label>최초 잠수</label>

          <select
            value={firstDepth}
            onChange={(e) => setFirstDepth(Number(e.target.value))}
          >
            {DEPTHS.map((depth) => (
              <option key={depth} value={depth}>
                {depth}m
              </option>
            ))}
          </select>

          <input
            type="number"
            value={bottomTime}
            onChange={(e) => setBottomTime(Number(e.target.value))}
            placeholder="분"
          />

          <div className="planner-result-chip">
            최초그룹 <strong>{firstGroup || "-"}</strong>
          </div>
        </div>

        <div className="planner-inline-row">
          <label>수면 휴식</label>

          <input
            type="number"
            value={surfaceInterval}
            onChange={(e) => setSurfaceInterval(Number(e.target.value))}
            placeholder="휴식 분"
          />

          <div className="planner-result-chip">
            조정그룹 <strong>{adjustedGroup || "-"}</strong>
          </div>
        </div>

        <div className="planner-step">
          <strong>3</strong>
          <h3>결과</h3>
          <p>
            입력 수심은 표 기준에 맞춰 <b>{result.roundedDepth || "-"}m</b>로 계산됩니다.
          </p>
          <p>
            예: 18m / 30분 / SIT 60분 → F 그룹 → E 그룹
          </p>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="planner-result-table compact">
          <thead>
            <tr>
              <th>수심</th>
              <th>RNT</th>
              <th>AMDT</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(rntTable || {}).map(([depth, values]) => (
              <tr key={depth}>
                <td>{depth}m</td>
                <td>{values[0]}</td>
                <td>{values[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="table-warning">
        ※ 이 계산기는 NAUI 기준 다이빙표를 참고하였습니다. 이 내용은 기록/학습용 참고 기능입니다. 실제 다이빙 계획은 본인 교육기관 표와 다이브컴퓨터를 우선하세요.
      </p>
    </>
  );
}

const REGION_GROUPS = {
  동해: {
    고성: { lat: 38.3806, lon: 128.4676, stationKeyword: "고성" },
    속초: { lat: 38.2070, lon: 128.5918, stationKeyword: "속초" },
    양양: { lat: 38.0754, lon: 128.6189, stationKeyword: "양양" },
    강릉: { lat: 37.7519, lon: 128.8761, stationKeyword: "강릉" },
    동해: { lat: 37.5247, lon: 129.1143, stationKeyword: "동해" },
    삼척: { lat: 37.4499, lon: 129.1652, stationKeyword: "삼척" },
    울진: { lat: 36.9931, lon: 129.4005, stationKeyword: "울진" },
    영덕: { lat: 36.4151, lon: 129.3650, stationKeyword: "영덕" },
    포항: { lat: 36.0190, lon: 129.3435, stationKeyword: "포항" },
    경주: { lat: 35.8562, lon: 129.2247, stationKeyword: "경주" },
  },
  남해: {
    기장: { lat: 35.2446, lon: 129.2222, stationKeyword: "기장" },
    부산: { lat: 35.1796, lon: 129.0756, stationKeyword: "부산" },
    거제: { lat: 34.8806, lon: 128.6211, stationKeyword: "거제" },
    통영: { lat: 34.8544, lon: 128.4332, stationKeyword: "통영" },
    남해: { lat: 34.8377, lon: 127.8925, stationKeyword: "남해" },
    여수: { lat: 34.7604, lon: 127.6622, stationKeyword: "여수" },
    완도: { lat: 34.3110, lon: 126.7550, stationKeyword: "완도" },
  },
  서해: {
    인천: { lat: 37.4563, lon: 126.7052, stationKeyword: "인천" },
    태안: { lat: 36.7457, lon: 126.2978, stationKeyword: "태안" },
    보령: { lat: 36.3335, lon: 126.6127, stationKeyword: "보령" },
    군산: { lat: 35.9676, lon: 126.7369, stationKeyword: "군산" },
    목포: { lat: 34.8118, lon: 126.3922, stationKeyword: "목포" },
  },
  제주도: {
    제주시: { lat: 33.4996, lon: 126.5312, stationKeyword: "제주" },
    서귀포: { lat: 33.2541, lon: 126.5601, stationKeyword: "서귀포" },
    성산: { lat: 33.4589, lon: 126.9425, stationKeyword: "성산" },
    우도: { lat: 33.5065, lon: 126.9559, stationKeyword: "우도" },
  },
  도서: {
    울릉도: { lat: 37.4844, lon: 130.9057, stationKeyword: "울릉" },
    독도: { lat: 37.2419, lon: 131.8644, stationKeyword: "독도" },
  },
};

function getRegionInfo(region) {
  for (const group of Object.values(REGION_GROUPS)) {
    if (group[region]) return group[region];
  }

  return REGION_GROUPS.동해.강릉;
}

function MiniWaterTempCard({ selectedRegion }) {
  const [items, setItems] = useState([]);

  const loadData = async () => {
    try {
      const response = await fetch("/api/water-temp");
      const data = await response.json();
      setItems(data || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const regionInfo = getRegionInfo(selectedRegion);
  const keyword = regionInfo.stationKeyword || selectedRegion;

  const selectedItems = items.filter((item) =>
    item.station?.includes(keyword)
  );

  const surface = selectedItems.find((item) => item.layer === "표층");
  const middle = selectedItems.find((item) => item.layer === "중층");
  const bottom = selectedItems.find((item) => item.layer === "저층");

  return (
    <div className="quick-card mini-live-card">
      <div className="quick-title-row">
        <div className="quick-icon">🌡️</div>
        <strong>실시간 수온</strong>
      </div>
      <span className="mini-region-label">{selectedRegion}</span>

      <div className="mini-water-layers">
        <div>
          <b>🌊</b>
          <span>표층</span>
          <strong>{surface?.temperature ? `${surface.temperature}°C` : "-"}</strong>
        </div>

        <div>
          <b>🫧</b>
          <span>중층</span>
          <strong>{middle?.temperature ? `${middle.temperature}°C` : "-"}</strong>
        </div>

        <div>
          <b>🪸</b>
          <span>저층</span>
          <strong>{bottom?.temperature ? `${bottom.temperature}°C` : "-"}</strong>
        </div>
      </div>

      <small className="mini-help-text">
        {selectedItems[0]?.station || "해당 지역 관측소 없음"}
      </small>
    </div>
  );
}

function MiniWeatherCard({ selectedRegion, setSelectedRegion }) {
  const [weather, setWeather] = useState(null);

  const loadWeather = async (lat, lon) => {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&timezone=Asia%2FSeoul`;

      const response = await fetch(url);
      const data = await response.json();

      setWeather(data.current || null);
    } catch {
      setWeather(null);
    }
  };

  useEffect(() => {
    const loc = getRegionInfo(selectedRegion);
    loadWeather(loc.lat, loc.lon);
  }, [selectedRegion]);

  const weatherIcon = (code) => {
    if ([0, 1].includes(code)) return "☀️";
    if ([2, 3].includes(code)) return "⛅";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 61, 63, 65].includes(code)) return "🌧️";
    if ([71, 73, 75].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌤️";
  };

  return (
    <div className="quick-card mini-live-card">
      <div className="quick-title-row">
        <div className="quick-icon">🌤️</div>
        <strong>오늘 날씨</strong>
      </div>

      <select
        className="mini-select"
        value={selectedRegion}
        onChange={(e) => setSelectedRegion(e.target.value)}
      >
        {Object.entries(REGION_GROUPS).map(([groupName, regions]) => (
          <optgroup label={groupName} key={groupName}>
            {Object.keys(regions).map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {weather ? (
        <div className="mini-weather-grid">
          <div>
            <b>{weatherIcon(weather.weather_code)}</b>
            <span>날씨</span>
            <strong>{weather.temperature_2m}°C</strong>
          </div>

          <div>
            <b>💨</b>
            <span>풍속</span>
            <strong>{weather.wind_speed_10m}m/s</strong>
          </div>

          <div>
            <b>💧</b>
            <span>습도</span>
            <strong>{weather.relative_humidity_2m}%</strong>
          </div>
        </div>
      ) : (
        <div className="mini-live-list">
          <span>날씨 정보를 불러오는 중...</span>
        </div>
      )}
    </div>
  );
}