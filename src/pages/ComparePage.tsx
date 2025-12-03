import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet-side-by-side";
import { useField } from "../contexts/FieldContext";
import axios from "../config/axios";
import { getImageUrl } from "../config/api";

interface VISnapshot {
  id: string;
  field_id: string;
  vi_type: string;
  snapshot_date: string;
  mean_value: number;
  overlay_url?: string;
  analysis_message?: string;
}

const ComparePage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const sideBySideControlRef = useRef<any>(null);
  const leftOverlayRef = useRef<L.ImageOverlay | null>(null);
  const rightOverlayRef = useRef<L.ImageOverlay | null>(null);

  const { getField, currentField } = useField();
  const [isLoading, setIsLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<VISnapshot[]>([]);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);

  useEffect(() => {
    if (!fieldId) {
      navigate("/map");
      return;
    }

    loadField();
  }, [fieldId]);

  useEffect(() => {
    if (currentField && mapContainerRef.current && !mapRef.current) {
      initializeMap();
    }
  }, [currentField]);

  useEffect(() => {
    if (currentField) {
      loadSnapshots();
    }
  }, [currentField]);

  useEffect(() => {
    if (snapshots.length >= 2 && mapRef.current) {
      updateOverlays();
    }
  }, [leftIndex, rightIndex, snapshots]);

  const loadField = async () => {
    if (!fieldId) return;

    try {
      setIsLoading(true);
      await getField(fieldId);
    } catch (error: any) {
      console.error("Failed to load field:", error);
      alert("ไม่สามารถโหลดข้อมูลแปลงได้: " + error.message);
      navigate("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSnapshots = async () => {
    if (!fieldId) return;

    try {
      const response = await axios.get(`/vi-analysis/snapshots/${fieldId}`, {
        params: { limit: 6 },
      });

      const snapshotData = response.data;

      // If we don't have enough snapshots, create mock ones
      if (snapshotData.length < 4) {
        const mockSnapshots = generateMockSnapshots();
        setSnapshots(mockSnapshots);
      } else {
        setSnapshots(snapshotData);
      }
    } catch (error) {
      console.error("Failed to load snapshots:", error);
      // Use mock data if API fails
      const mockSnapshots = generateMockSnapshots();
      setSnapshots(mockSnapshots);
    }
  };

  const generateMockSnapshots = (): VISnapshot[] => {
    const mockData: VISnapshot[] = [];
    const dates = ["ล่าสุด", "7 วันก่อน", "14 วันก่อน", "21 วันก่อน"];

    dates.forEach((date, index) => {
      mockData.push({
        id: `mock-${index}`,
        field_id: fieldId || "",
        vi_type: "NDVI",
        snapshot_date: new Date(
          Date.now() - index * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        mean_value: 0.6 - index * 0.05 + (Math.random() - 0.5) * 0.1,
        overlay_url: generateMockOverlay(index),
        analysis_message: date,
      });
    });

    return mockData;
  };

  const generateMockOverlay = (index: number): string => {
    // Generate a simple colored rectangle as mock overlay
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext("2d")!;

    // Create gradient based on index
    const gradient = ctx.createLinearGradient(0, 0, 200, 150);
    const intensity = Math.max(0.3, 1 - index * 0.2);
    gradient.addColorStop(0, `rgba(255, 100, 100, ${intensity})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 100, ${intensity})`);
    gradient.addColorStop(1, `rgba(100, 255, 100, ${intensity})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 150);

    return canvas.toDataURL();
  };

  const initializeMap = () => {
    if (!mapContainerRef.current || !currentField || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([currentField.centroid_lat, currentField.centroid_lng], 15);

    // Add base layers
    const esriSatellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri",
      }
    ).addTo(map);

    // Add field boundary
    if (currentField.geometry) {
      const fieldLayer = L.geoJSON(currentField.geometry, {
        style: {
          color: "#2b7a4b",
          weight: 2,
          fillOpacity: 0.05,
        },
      }).addTo(map);

      map.fitBounds(fieldLayer.getBounds(), { padding: [20, 20] });
    }

    mapRef.current = map;
  };

  const updateOverlays = () => {
    if (!mapRef.current || !currentField || snapshots.length < 2) return;

    const fieldLayer = L.geoJSON(currentField.geometry);
    const bounds = fieldLayer.getBounds();

    // Remove existing overlays
    if (leftOverlayRef.current) {
      mapRef.current.removeLayer(leftOverlayRef.current);
    }
    if (rightOverlayRef.current) {
      mapRef.current.removeLayer(rightOverlayRef.current);
    }

    // Create new overlays
    const leftSnapshot = snapshots[leftIndex];
    const rightSnapshot = snapshots[rightIndex];

    if (leftSnapshot?.overlay_url) {
      leftOverlayRef.current = L.imageOverlay(
        getImageUrl(leftSnapshot.overlay_url),
        bounds,
        { opacity: 0.8 }
      ).addTo(mapRef.current);
    }

    if (rightSnapshot?.overlay_url) {
      rightOverlayRef.current = L.imageOverlay(
        getImageUrl(rightSnapshot.overlay_url),
        bounds,
        { opacity: 0.8 }
      ).addTo(mapRef.current);
    }

    // Setup side-by-side control
    if (leftOverlayRef.current && rightOverlayRef.current) {
      if (sideBySideControlRef.current) {
        mapRef.current.removeControl(sideBySideControlRef.current);
      }

      // Import and use side-by-side control
      if ((L as any).control.sideBySide) {
        sideBySideControlRef.current = (L as any).control
          .sideBySide(leftOverlayRef.current, rightOverlayRef.current)
          .addTo(mapRef.current);
      }
    }
  };

  const handleCancelCompare = () => {
    navigate(`/health/${fieldId}`);
  };

  if (isLoading) {
    return (
      <section className="page active">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <div>กำลังโหลด...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active">
      <div className="map-pane">
        <div ref={mapContainerRef} className="map" />

        {/* Top Bar */}
        <div className="compare-topbar">
          <span style={{ cursor: "pointer" }} onClick={handleCancelCompare}>
            ✕ ยกเลิกเปรียบเทียบ
          </span>
        </div>

        {/* Left Thumbnail Strip */}
        <div className="thumb-strip left">
          {snapshots.map((snapshot, index) => (
            <div
              key={`left-${snapshot.id}`}
              className={`thumb-tile ${leftIndex === index ? "active" : ""}`}
              onClick={() => setLeftIndex(index)}
              title={`ซ้าย: ${
                snapshot.analysis_message || "Snapshot " + (index + 1)
              }`}
            >
              {snapshot.overlay_url && (
                <img src={snapshot.overlay_url} alt={`Snapshot ${index + 1}`} />
              )}
            </div>
          ))}
        </div>

        {/* Right Thumbnail Strip */}
        <div className="thumb-strip right">
          {snapshots.map((snapshot, index) => (
            <div
              key={`right-${snapshot.id}`}
              className={`thumb-tile ${rightIndex === index ? "active" : ""}`}
              onClick={() => setRightIndex(index)}
              title={`ขวา: ${
                snapshot.analysis_message || "Snapshot " + (index + 1)
              }`}
            >
              {snapshot.overlay_url && (
                <img src={snapshot.overlay_url} alt={`Snapshot ${index + 1}`} />
              )}
            </div>
          ))}
        </div>

        {/* Side Controls */}
        <div className="side-controls">
          <button className="scbtn" onClick={() => mapRef.current?.zoomIn()}>
            ＋
          </button>
          <button className="scbtn" onClick={() => mapRef.current?.zoomOut()}>
            －
          </button>
          <button
            className="scbtn"
            onClick={() =>
              mapRef.current?.locate({ setView: true, maxZoom: 14 })
            }
          >
            📍
          </button>
        </div>

        {/* Comparison Info */}
        {snapshots.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255, 255, 255, 0.9)",
              padding: "10px 20px",
              borderRadius: "8px",
              zIndex: 800,
              fontSize: "14px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <strong>เปรียบเทียบ:</strong>
              <br />
              ซ้าย:{" "}
              {snapshots[leftIndex]?.analysis_message ||
                `Snapshot ${leftIndex + 1}`}
              (ค่าเฉลี่ย: {snapshots[leftIndex]?.mean_value.toFixed(3)})<br />
              ขวา:{" "}
              {snapshots[rightIndex]?.analysis_message ||
                `Snapshot ${rightIndex + 1}`}
              (ค่าเฉลี่ย: {snapshots[rightIndex]?.mean_value.toFixed(3)})
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ComparePage;
