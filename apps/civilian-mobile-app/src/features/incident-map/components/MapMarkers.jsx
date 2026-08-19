import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Circle, Marker } from "react-native-maps";
import {
  AlertTriangle,
  Building2,
  Flame,
  HeartPulse,
  Shield,
  Truck,
} from "lucide-react-native";
import {
  distanceBetweenKm,
  formatDistanceLabel,
  getResponderMarkerStyle,
} from "@/features/incident-map/utils/mapUtils";

const RESPONDER_ICONS = {
  flame: Flame,
  shield: Shield,
  heartPulse: HeartPulse,
  truck: Truck,
};

const PIN_HEAD = 34;
const PIN_TAIL = 10;

function IncidentPinMarker() {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.pinHead}>
        <AlertTriangle size={16} color="#FFFFFF" strokeWidth={2.4} />
      </View>
      <View style={styles.pinTail} />
    </View>
  );
}

export const IncidentMapMarker = memo(function IncidentMapMarker({
  coordinate,
  distanceLabel,
}) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      accessibilityLabel={
        distanceLabel
          ? `Incident location, ${distanceLabel}`
          : "Incident location"
      }
    >
      <IncidentPinMarker />
    </Marker>
  );
});

function MarkerBubble({ color, children, size = 36 }) {
  return (
    <View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      {children}
    </View>
  );
}

export const ResponderMapMarker = memo(function ResponderMapMarker({
  coordinate,
  unitType,
  title,
  distanceLabel,
  onPress,
}) {
  const style = getResponderMarkerStyle(unitType);
  const Icon = RESPONDER_ICONS[style.iconKey] || Truck;
  const a11yDistance = distanceLabel ? `, ${distanceLabel}` : "";

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      title={title}
      onPress={onPress}
      accessibilityLabel={`${style.label} unit${a11yDistance}`}
    >
      <MarkerBubble color={style.color}>
        <Icon size={18} color="#FFFFFF" strokeWidth={2.2} />
      </MarkerBubble>
    </Marker>
  );
});

export const FacilityMapMarker = memo(function FacilityMapMarker({
  coordinate,
  kind,
  title,
  distanceLabel,
  onPress,
}) {
  const config = {
    fire: { color: "#FF3B30", Icon: Flame, label: "Fire station" },
    hospital: { color: "#FF2D55", Icon: HeartPulse, label: "Hospital" },
    police: { color: "#5856D6", Icon: Shield, label: "Police station" },
    rhu: { color: "#34C759", Icon: HeartPulse, label: "Rural health unit" },
    evacuation: { color: "#FF9500", Icon: Building2, label: "Evacuation center" },
    default: { color: "#8E8E93", Icon: AlertTriangle, label: "Facility" },
  }[kind] || { color: "#8E8E93", Icon: AlertTriangle, label: "Facility" };

  const Icon = config.Icon;
  const a11yDistance = distanceLabel ? `, ${distanceLabel}` : "";

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      title={title}
      onPress={onPress}
      accessibilityLabel={`${config.label}${a11yDistance}`}
    >
      <MarkerBubble color={config.color} size={32}>
        <Icon size={16} color="#FFFFFF" strokeWidth={2.2} />
      </MarkerBubble>
    </Marker>
  );
});

export const IncidentRadiusCircle = memo(function IncidentRadiusCircle({
  coordinate,
  radiusMeters = 120,
  fillColor = "rgba(255, 59, 48, 0.08)",
  strokeColor = "rgba(255, 59, 48, 0.22)",
}) {
  if (!coordinate) return null;

  return (
    <Circle
      center={coordinate}
      radius={radiusMeters}
      fillColor={fillColor}
      strokeColor={strokeColor}
      strokeWidth={1.5}
    />
  );
});

export function getMarkerDistanceLabel(userLocation, latitude, longitude) {
  if (!userLocation) return null;
  return formatDistanceLabel(
    distanceBetweenKm(userLocation, { latitude, longitude })
  );
}

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: "center",
    width: PIN_HEAD,
  },
  pinHead: {
    width: PIN_HEAD,
    height: PIN_HEAD,
    borderRadius: PIN_HEAD / 2,
    backgroundColor: "#FF3B30",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 6,
  },
  pinTail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: PIN_TAIL,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF3B30",
  },
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
  },
});
