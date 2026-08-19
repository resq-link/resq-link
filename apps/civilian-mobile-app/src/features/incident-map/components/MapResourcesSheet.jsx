import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Navigation, Phone, Search } from "lucide-react-native";
import {
  filterMapResources,
  getStatusBadgeStyle,
} from "@/features/incident-map/utils/mapUtils";

function Section({ title, count, theme, children }) {
  if (!children) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {count != null ? (
          <View style={[styles.countPill, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.countText, { color: theme.primary }]}>{count}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ResponderCard({ item, theme, isLight, onPress }) {
  const badge = getStatusBadgeStyle(item.status, isLight);
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.statusText, { color: badge.textColor }]}>
            {(item.status || "unknown").replace(/_/g, " ")}
          </Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Navigation size={14} color={theme.textSecondary} />
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>
          {item.unitType}
          {item.agency ? ` • ${item.agency}` : ""}
        </Text>
      </View>
      {item.phone ? (
        <View style={styles.metaRow}>
          <Phone size={14} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {item.phone}
          </Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

function FacilityCard({ item, theme, subtitle, onPress }) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
        {item.name}
      </Text>
      {subtitle ? (
        <Text style={[styles.metaText, { color: theme.textSecondary, marginTop: 4 }]}>
          {subtitle}
        </Text>
      ) : null}
    </Wrapper>
  );
}

function buildSearchCatalog(responders, categorized) {
  const items = responders.map((item) => ({
    ...item,
    markerKind: "responder",
    subtitle: item.unitType,
  }));

  categorized.fireStations.forEach((item) =>
    items.push({ ...item, kind: "fire", markerKind: "facility", subtitle: "Fire station" })
  );
  categorized.hospitals.forEach((item) =>
    items.push({ ...item, kind: "hospital", markerKind: "facility", subtitle: "Hospital" })
  );
  categorized.policeStations.forEach((item) =>
    items.push({ ...item, kind: "police", markerKind: "facility", subtitle: "Police station" })
  );
  categorized.rhuCenters.forEach((item) =>
    items.push({ ...item, kind: "rhu", markerKind: "facility", subtitle: "Rural health unit" })
  );
  categorized.evacuationCenters.forEach((item) =>
    items.push({
      ...item,
      kind: "evacuation",
      markerKind: "facility",
      subtitle: "Evacuation center",
    })
  );

  return items;
}

export default function MapResourcesSheet({
  theme,
  isLight,
  responders,
  categorized,
  bottomInset,
  onSelectResource,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    fireStations,
    hospitals,
    policeStations,
    rhuCenters,
    evacuationCenters,
  } = categorized;

  const searchCatalog = useMemo(
    () => buildSearchCatalog(responders, categorized),
    [responders, categorized]
  );

  const filteredResults = useMemo(
    () => filterMapResources(searchCatalog, searchQuery),
    [searchCatalog, searchQuery]
  );

  const isSearching = searchQuery.trim().length > 0;

  const handleSelect = (item) => {
    onSelectResource?.(item);
  };

  return (
    <BottomSheetScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: bottomInset + 24,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.headline, { color: theme.text }]}>
        Emergency Resources
      </Text>
      <Text style={[styles.subhead, { color: theme.textSecondary }]}>
        Nearby responders and public safety facilities
      </Text>

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: theme.cardInner ?? theme.card, borderColor: theme.border },
        ]}
      >
        <Search size={18} color={theme.textSecondary} strokeWidth={2.2} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search hospitals, fire stations, responders…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel="Search emergency resources"
          returnKeyType="search"
        />
      </View>

      {isSearching ? (
        <Section
          title="Search Results"
          count={filteredResults.length}
          theme={theme}
        >
          {filteredResults.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              No resources match "{searchQuery.trim()}".
            </Text>
          ) : (
            filteredResults.map((item) =>
              item.markerKind === "responder" ? (
                <ResponderCard
                  key={`search-${item.source}-${item.id}`}
                  item={item}
                  theme={theme}
                  isLight={isLight}
                  onPress={() => handleSelect(item)}
                />
              ) : (
                <FacilityCard
                  key={`search-${item.kind}-${item.id}`}
                  item={item}
                  theme={theme}
                  subtitle={item.subtitle}
                  onPress={() => handleSelect(item)}
                />
              )
            )
          )}
        </Section>
      ) : (
        <>
          <Section title="Nearby Responders" count={responders.length} theme={theme}>
            {responders.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                No responder locations available right now.
              </Text>
            ) : (
              responders.map((item) => (
                <ResponderCard
                  key={`${item.source}-${item.id}`}
                  item={item}
                  theme={theme}
                  isLight={isLight}
                  onPress={() => handleSelect({ ...item, markerKind: "responder" })}
                />
              ))
            )}
          </Section>

          {fireStations.length > 0 ? (
            <Section title="Fire Stations" count={fireStations.length} theme={theme}>
              {fireStations.map((item) => (
                <FacilityCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  subtitle="Fire station"
                  onPress={() =>
                    handleSelect({
                      ...item,
                      kind: "fire",
                      markerKind: "facility",
                      subtitle: "Fire station",
                    })
                  }
                />
              ))}
            </Section>
          ) : null}

          {hospitals.length > 0 ? (
            <Section title="Hospitals" count={hospitals.length} theme={theme}>
              {hospitals.map((item) => (
                <FacilityCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  subtitle="Hospital"
                  onPress={() =>
                    handleSelect({
                      ...item,
                      kind: "hospital",
                      markerKind: "facility",
                      subtitle: "Hospital",
                    })
                  }
                />
              ))}
            </Section>
          ) : null}

          {policeStations.length > 0 ? (
            <Section title="Police Stations" count={policeStations.length} theme={theme}>
              {policeStations.map((item) => (
                <FacilityCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  subtitle="Police station"
                  onPress={() =>
                    handleSelect({
                      ...item,
                      kind: "police",
                      markerKind: "facility",
                      subtitle: "Police station",
                    })
                  }
                />
              ))}
            </Section>
          ) : null}

          {rhuCenters.length > 0 ? (
            <Section title="RHUs" count={rhuCenters.length} theme={theme}>
              {rhuCenters.map((item) => (
                <FacilityCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  subtitle="Rural health unit"
                  onPress={() =>
                    handleSelect({
                      ...item,
                      kind: "rhu",
                      markerKind: "facility",
                      subtitle: "Rural health unit",
                    })
                  }
                />
              ))}
            </Section>
          ) : null}

          {evacuationCenters.length > 0 ? (
            <Section title="Evacuation Centers" count={evacuationCenters.length} theme={theme}>
              {evacuationCenters.map((item) => (
                <FacilityCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  subtitle="Evacuation center"
                  onPress={() =>
                    handleSelect({
                      ...item,
                      kind: "evacuation",
                      markerKind: "facility",
                      subtitle: "Evacuation center",
                    })
                  }
                />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subhead: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    padding: 0,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "capitalize",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
});
