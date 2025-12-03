import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";
import { useField } from "../contexts/FieldContext";

interface Field {
  id: string;
  name: string;
  user_id: string; // เปลี่ยนจาก owner_id เป็น user_id ให้ตรงกับ FieldContext
  crop_type?: string;
  variety?: string;
  planting_season?: string;
  planting_date?: string;
  geometry: any;
  area_m2: number;
  centroid_lat: number;
  centroid_lng: number;
  address?: string;
  created_at: string;
}

interface FieldCardProps {
  field: Field;
}

const FieldCard: React.FC<FieldCardProps> = ({ field }) => {
  const navigate = useNavigate();
  const { deleteField, updateField, getThumbnail } = useField();
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<
    "shp" | "gpkg" | "kml" | "geojson" | "csv_wkt"
  >("geojson");
  const [editFormData, setEditFormData] = useState({
    name: field.name,
    crop_type: field.crop_type || "ข้าวหอมมะลิ",
    variety: field.variety || "ข้าวหอมมะลิ",
    planting_season: field.planting_season || "",
    planting_date: field.planting_date
      ? new Date(field.planting_date).toISOString().split("T")[0]
      : "",
  });

  useEffect(() => {
    loadThumbnail();
  }, [field.id]);

  const loadThumbnail = async () => {
    try {
      const thumbnailData = await getThumbnail(field.id);
      setThumbnail(thumbnailData);
    } catch (error) {
      console.error("Failed to load thumbnail:", error);
    }
  };

  const handleCardClick = () => {
    navigate(`/field/${field.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmMessage = `คุณต้องการลบแปลง "${field.name}" หรือไม่?\n\nการลบนี้ไม่สามารถยกเลิกได้`;

    if (confirm(confirmMessage)) {
      try {
        console.log("🗑️ กำลังลบแปลง:", field.name);
        await deleteField(field.id);
        alert("ลบแปลงสำเร็จ");
        console.log("✅ ลบแปลงสำเร็จ:", field.id);
      } catch (error: any) {
        console.error("❌ ลบแปลงไม่สำเร็จ:", error);

        let errorMessage = "ลบแปลงไม่สำเร็จ";

        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = "ไม่พบแปลงที่ต้องการลบ";
          } else if (error.response.status === 403) {
            errorMessage = "คุณไม่มีสิทธิ์ลบแปลงนี้";
          } else {
            errorMessage = error.response.data?.detail || errorMessage;
          }
        } else {
          errorMessage = error.message || errorMessage;
        }

        alert(errorMessage);
      }
    }
  };

  const geojsonFeatureCollection = () => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: field.geometry,
        properties: {
          name: field.name,
          crop_type: field.crop_type,
          area_m2: field.area_m2,
          planting_date: field.planting_date,
        },
      },
    ],
  });

  const toSafeFilename = (name: string, fallbackBase: string) => {
    try {
      const ascii = name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
      const base = ascii && /[a-z0-9]/.test(ascii) ? ascii : fallbackBase;
      return base;
    } catch {
      return fallbackBase;
    }
  };

  const fileBase = toSafeFilename(field.name, `field_${field.id}`);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsGeoJSON = () => {
    const geo = geojsonFeatureCollection();
    const blob = new Blob([JSON.stringify(geo, null, 2)], {
      type: "application/geo+json",
    });
    downloadBlob(blob, `${fileBase}.geojson`);
  };

  const exportAsKML = () => {
    try {
      const feature = geojsonFeatureCollection().features[0];
      const geom = feature.geometry;
      // Support Polygon and MultiPolygon
      const polygons: number[][][][] =
        geom.type === "Polygon"
          ? [geom.coordinates]
          : geom.type === "MultiPolygon"
          ? geom.coordinates
          : [];
      const polygonPlacemarks = polygons
        .map((ringSets, idx) => {
          const outer = ringSets[0];
          const coords = outer.map(([lng, lat]) => `${lng},${lat},0`).join(" ");
          return `\n        <Placemark>\n          <name>${field.name}${
            polygons.length > 1 ? ` ${idx + 1}` : ""
          }</name>\n          <ExtendedData>\n            <Data name="crop_type"><value>${
            field.crop_type || ""
          }</value></Data>\n            <Data name="area_m2"><value>${
            field.area_m2
          }</value></Data>\n            <Data name="planting_date"><value>${
            field.planting_date || ""
          }</value></Data>\n          </ExtendedData>\n          <Style><LineStyle><color>ff2b7a4b</color><width>2</width></LineStyle><PolyStyle><color>1a2b7a4b</color></PolyStyle></Style>\n          <Polygon>\n            <outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>\n          </Polygon>\n        </Placemark>`;
        })
        .join("\n");
      const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>${field.name}</name>${polygonPlacemarks}\n  </Document>\n</kml>`;
      const blob = new Blob([kml], {
        type: "application/vnd.google-earth.kml+xml;charset=utf-8",
      });
      downloadBlob(blob, `${fileBase}.kml`);
    } catch (e) {
      alert("แปลงไฟล์ KML ไม่สำเร็จ");
      console.error(e);
    }
  };

  const geojsonToWKT = (): string => {
    const geom = field.geometry;
    if (!geom) return "";
    const toPair = (c: number[]) => `${c[0]} ${c[1]}`; // lng lat
    if (geom.type === "Point") {
      return `POINT (${toPair(geom.coordinates)})`;
    }
    if (geom.type === "LineString") {
      return `LINESTRING (${geom.coordinates.map(toPair).join(", ")})`;
    }
    if (geom.type === "Polygon") {
      const rings = geom.coordinates
        .map((ring: number[][]) => `(${ring.map(toPair).join(", ")})`)
        .join(", ");
      return `POLYGON (${rings})`;
    }
    if (geom.type === "MultiPolygon") {
      const polys = geom.coordinates
        .map(
          (poly: number[][][]) =>
            `(${poly
              .map((ring: number[][]) => `(${ring.map(toPair).join(", ")})`)
              .join(", ")})`
        )
        .join(", ");
      return `MULTIPOLYGON (${polys})`;
    }
    return "";
  };

  const exportAsCSVWKT = () => {
    const headers = ["name", "crop_type", "area_m2", "planting_date", "wkt"];
    const wkt = geojsonToWKT();
    const row = [
      field.name,
      field.crop_type || "",
      String(field.area_m2),
      field.planting_date || "",
      wkt,
    ]
      .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
      .join(",");
    const BOM = "\uFEFF";
    const csv = BOM + headers.join(",") + "\n" + row;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${fileBase}.csv`);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDownloadPanel(true);
    setShowFormatMenu(false);
  };

  const confirmDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    switch (exportFormat) {
      case "geojson":
        exportAsGeoJSON();
        break;
      case "kml":
        (async () => {
          try {
            const res = await axios.get(`/fields/${field.id}/export/kml`, {
              responseType: "blob",
            });
            const blob = new Blob([res.data], {
              type: "application/vnd.google-earth.kml+xml",
            });
            downloadBlob(blob, `${fileBase}.kml`);
          } catch (err) {
            console.warn(
              "Backend KML export failed; falling back to client conversion",
              err
            );
            exportAsKML();
          }
        })();
        break;
      case "csv_wkt":
        exportAsCSVWKT();
        break;
      case "shp":
      case "gpkg":
        (async () => {
          try {
            const res = await axios.get(
              `/fields/${field.id}/export/${exportFormat}`,
              { responseType: "blob" }
            );
            const filename = `${fileBase}.${
              exportFormat === "shp" ? "zip" : "gpkg"
            }`;
            const type =
              exportFormat === "shp"
                ? "application/zip"
                : "application/geopackage+sqlite3";
            const blob = new Blob([res.data], { type });
            downloadBlob(blob, filename);
          } catch (err: any) {
            const message =
              err?.response?.data?.detail ||
              "ไม่สามารถส่งออกไฟล์ได้ โปรดลองอีกครั้ง";
            alert(message);
          }
        })();
        break;
      default:
        exportAsGeoJSON();
    }
    setShowDownloadPanel(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // แปลง date format ถ้ามี
      let planting_date = null;
      if (editFormData.planting_date) {
        planting_date = new Date(editFormData.planting_date).toISOString();
      }

      const updateData = {
        name: editFormData.name.trim(),
        crop_type: editFormData.crop_type,
        variety: editFormData.variety,
        planting_season: editFormData.planting_season || null,
        planting_date: planting_date,
      };

      await updateField(field.id, updateData);
      setShowEditModal(false);
      alert("แก้ไขแปลงสำเร็จ!");
    } catch (error: any) {
      alert("แก้ไขแปลงไม่สำเร็จ: " + error.message);
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    // รีเซ็ตฟอร์มเป็นค่าเดิม
    setEditFormData({
      name: field.name,
      crop_type: field.crop_type || "ข้าวหอมมะลิ",
      variety: field.variety || "ข้าวหอมมะลิ",
      planting_season: field.planting_season || "",
      planting_date: field.planting_date
        ? new Date(field.planting_date).toISOString().split("T")[0]
        : "",
    });
  };

  const formatArea = (area_m2: number): string => {
    // Convert to Thai units: 1 ไร่ = 1600 ตร.ม. | 1 งาน = 400 ตร.ม. | 1 ตร.วา = 4 ตร.ม.
    const rai = Math.floor(area_m2 / 1600);
    const rem1 = area_m2 - rai * 1600;
    const ngan = Math.floor(rem1 / 400);
    const rem2 = rem1 - ngan * 400;
    const wah = Math.round(rem2 / 4);

    return `${rai} ไร่ ${ngan} งาน ${wah} ตร.วา`;
  };

  const formatCoordinates = (): string => {
    return `${field.centroid_lat.toFixed(6)}, ${field.centroid_lng.toFixed(6)}`;
  };

  const formatAddress = (): string => {
    return field.address || "(ยังไม่ได้รีเวิร์สจีโอโค้ด)";
  };

  return (
    <>
      <div
        className="field-card"
        onClick={handleCardClick}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "16px",
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
          transition: "var(--transition)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Header with image and title */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          <img
            className="field-thumb"
            src={
              thumbnail ||
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="100"><rect width="100%" height="100%" rx="10" ry="10" fill="#fff" stroke="#e6e8ef"/><text x="10" y="24" font-size="14" fill="#6b7280">thumb</text></svg>'
            }
            alt="Field thumbnail"
            style={{
              width: "140px",
              height: "100px",
              objectFit: "cover",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--line)",
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-title" style={{ marginBottom: "8px" }}>
              <strong style={{ fontSize: "18px", color: "#1a1a1a" }}>
                {field.name}
              </strong>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <span
                className="pill"
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "var(--brand-light)",
                  color: "var(--brand)",
                  border: "1px solid rgba(31, 157, 85, 0.2)",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {field.crop_type || "ข้าว"}
              </span>
            </div>

            {/* Tools */}
            <div
              className="tools"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "12px",
                flexDirection: "row",
              }}
            >
              <button
                className="tool"
                title="ดาวน์โหลด"
                onClick={handleDownload}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  border: "2px solid #e5e7eb",
                  background: "#ffffff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  transition: "all 0.2s ease",
                  color: "#6b7280",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <img
                  src="/src/icon/DOWLOAD-BUTTOM.png"
                  alt="ดาวน์โหลด"
                  style={{ width: "20px", height: "20px" }}
                />
              </button>
              <button
                className="tool"
                title="แก้ไข"
                onClick={handleEdit}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  border: "2px solid #e5e7eb",
                  background: "#ffffff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  transition: "all 0.2s ease",
                  color: "#6b7280",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <img
                  src="/src/icon/EDIT-BUTTOM.png"
                  alt="แก้ไข"
                  style={{ width: "20px", height: "20px" }}
                />
              </button>
              <button
                className="tool"
                title="ลบ"
                onClick={handleDelete}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  border: "2px solid #e5e7eb",
                  background: "#ffffff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  transition: "all 0.2s ease",
                  color: "#6b7280",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <img
                  src="/src/icon/DELETE-BUTTOM.png"
                  alt="ลบ"
                  style={{ width: "20px", height: "20px" }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Information grid */}
        <div
          style={{
            backgroundColor: "#fefefe",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid var(--line)",
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "6px",
            }}
          >
            {/* Size */}
            <div
              style={{
                padding: "6px",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "3px",
                }}
              >
                📏 <strong style={{ color: "var(--brand)" }}>ขนาด:</strong>
              </div>
              <div
                style={{
                  color: "#059669",
                  marginLeft: "20px",
                  fontWeight: "bold",
                }}
              >
                {formatArea(field.area_m2)}
              </div>
            </div>

            {/* Location */}
            <div
              style={{
                padding: "6px",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "3px",
                }}
              >
                📍 <strong style={{ color: "var(--brand)" }}>ตำแหน่ง:</strong>
              </div>
              <div
                style={{
                  color: "#6b7280",
                  marginLeft: "20px",
                  lineHeight: "1.3",
                }}
              >
                {formatAddress()}
              </div>
            </div>

            {/* Coordinates */}
            <div
              style={{
                padding: "6px",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "3px",
                }}
              >
                🧭 <strong style={{ color: "var(--brand)" }}>พิกัด:</strong>
              </div>
              <div
                style={{
                  color: "#6b7280",
                  marginLeft: "20px",
                  fontFamily: "monospace",
                }}
              >
                {formatCoordinates()}
              </div>
            </div>

            {/* Planting Date */}
            {field.planting_date && (
              <div
                style={{
                  padding: "6px",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "3px",
                  }}
                >
                  🌱{" "}
                  <strong style={{ color: "var(--brand)" }}>ปลูกเมื่อ:</strong>
                </div>
                <div style={{ color: "#6b7280", marginLeft: "20px" }}>
                  {new Date(field.planting_date).toLocaleDateString("th-TH")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDownloadPanel &&
        ReactDOM.createPortal(
          <div
            onClick={() => {
              setShowDownloadPanel(false);
              setShowFormatMenu(false);
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px",
                width: "360px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "#eaf5ef",
                    color: "#1f9d55",
                    fontSize: "22px",
                  }}
                >
                  ⬇️
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  color: "#0f3d23",
                  marginBottom: "12px",
                }}
              >
                ดาวน์โหลดไฟล์แปลงของคุณ
              </div>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowFormatMenu((v) => !v)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #184a2f",
                    textAlign: "left",
                    background: "#fff",
                    color: "#184a2f",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontWeight: 600,
                  }}
                >
                  <span>
                    {exportFormat === "shp" && "ESRI Shapefile"}
                    {exportFormat === "gpkg" && "GeoPackage"}
                    {exportFormat === "kml" && "Keyhole Markup Language (KML)"}
                    {exportFormat === "geojson" && "GeoJSON"}
                    {exportFormat === "csv_wkt" && "CSV (WKT)"}
                  </span>
                  <span>▾</span>
                </button>
                {showFormatMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "52px",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      overflow: "hidden",
                      zIndex: 10,
                    }}
                  >
                    {[
                      { key: "shp", label: "ESRI Shapefile", disabled: false },
                      { key: "gpkg", label: "GeoPackage", disabled: false },
                      { key: "kml", label: "Keyhole Markup Language (KML)" },
                      { key: "geojson", label: "GeoJSON" },
                      { key: "csv_wkt", label: "CSV (WKT)" },
                    ].map((opt: any) => (
                      <div
                        key={opt.key}
                        onClick={() => {
                          if (opt.disabled) return;
                          setExportFormat(opt.key);
                          setShowFormatMenu(false);
                        }}
                        style={{
                          padding: "12px 14px",
                          cursor: opt.disabled ? "not-allowed" : "pointer",
                          color: opt.disabled ? "#a1a1aa" : "#0f3d23",
                          background: "#fff",
                        }}
                        title={opt.disabled ? "เร็วๆ นี้" : undefined}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "16px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDownloadPanel(false);
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDownload}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#1f9d55",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  ดาวน์โหลด
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 20px 0", color: "#1f2937" }}>
              แก้ไขข้อมูลแปลง
            </h3>

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  ชื่อแปลง
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  ชนิดพืช
                </label>
                <select
                  value={editFormData.crop_type}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      crop_type: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="ข้าวหอมมะลิ">ข้าวหอมมะลิ</option>
                  <option value="ข้าวกข6">ข้าวกข6</option>
                  <option value="ข้าวกข15">ข้าวกข15</option>
                  <option value="ข้าวปทุมธานี">ข้าวปทุมธานี</option>
                  <option value="ข้าวสุพรรณบุรี">ข้าวสุพรรณบุรี</option>
                  <option value="ข้าวเหนียว">ข้าวเหนียว</option>
                  <option value="ข้าวไรซ์เบอรี่">ข้าวไรซ์เบอรี่</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  สายพันธุ์ข้าว
                </label>
                <select
                  value={editFormData.variety}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      variety: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="ข้าวหอมมะลิ">ข้าวหอมมะลิ</option>
                  <option value="ข้าวกข6">ข้าวกข6</option>
                  <option value="ข้าวกข15">ข้าวกข15</option>
                  <option value="ข้าวปทุมธานี">ข้าวปทุมธานี</option>
                  <option value="ข้าวสุพรรณบุรี">ข้าวสุพรรณบุรี</option>
                  <option value="ข้าวเหนียว">ข้าวเหนียว</option>
                  <option value="ข้าวไรซ์เบอรี่">ข้าวไรซ์เบอรี่</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  ฤดูกาลปลูก
                </label>
                <select
                  value={editFormData.planting_season}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      planting_season: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">เลือกฤดูกาล</option>
                  <option value="นาปี">
                    นาปี - ปลูกในฤดูฝน (กรกฎาคม-ธันวาคม)
                  </option>
                  <option value="นาปรัง">
                    นาปรัง - ปลูกในฤดูแล้ง (มกราคม-เมษายน)
                  </option>
                  <option value="นาชลประทาน">
                    นาชลประทาน - ใช้น้ำจากระบบชลประทาน
                  </option>
                  <option value="นาฟ้าฝน">นาฟ้าฝน - พึ่งพาน้ำฝนเป็นหลัก</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  วันที่ปลูก
                </label>
                <input
                  type="date"
                  value={editFormData.planting_date}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      planting_date: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={handleEditCancel}
                  style={{
                    padding: "10px 20px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    backgroundColor: "#10b981",
                    color: "white",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FieldCard;
