import type { PlaceRecord } from "@/lib/place-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  Cloud,
  Hotel,
  MapPin,
  SquareParking,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "@wso2/oxygen-ui-icons-react";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events · Agent Testing Workspace" },
      {
        name: "description",
        content:
          "Browse and create venue risk evaluations, organized as cards.",
      },
    ],
  }),
  component: EventsPage,
});

type PlacesResponse = { places: PlaceRecord[] };

const RISK_COLOR: Record<string, "success" | "warning" | "error" | "default"> =
  {
    low: "success",
    moderate: "warning",
    high: "error",
    severe: "error",
  };

function EventsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [venueAddress, setVenueAddress] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [selected, setSelected] = useState<PlaceRecord | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["places"],
    queryFn: async (): Promise<PlacesResponse> => {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error(`Failed to load places (${res.status})`);
      return res.json();
    },
    refetchInterval: (query) =>
      query.state.data?.places.some((p) => p.status === "pending")
        ? 2000
        : false,
  });

  const createMutation = useMutation({
    mutationFn: async (input: { venueAddress: string; eventDate: string }) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok && res.status !== 200) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }
      return res.json() as Promise<{ place: PlaceRecord }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      setFormOpen(false);
      setVenueAddress("");
      setEventDate("");
      setEventTime("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      setSelected(null);
    },
  });

  function submitNewPlace(e: React.FormEvent) {
    e.preventDefault();
    if (!venueAddress.trim() || !eventDate.trim()) return;
    const combinedDate = eventTime.trim()
      ? `${eventDate.trim()} ${eventTime.trim()}`
      : eventDate.trim();
    createMutation.mutate({
      venueAddress: venueAddress.trim(),
      eventDate: combinedDate,
    });
  }

  const places = data?.places ?? [];

  return (
    <Box sx={{ height: "100%", overflowY: "auto", p: { xs: 2, md: 3 } }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3, maxWidth: "72rem", mx: "auto" }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Events
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Venues evaluated by the agent, organized as cards.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setFormOpen(true)}
          sx={{
            background: "linear-gradient(90deg, #ff5e3a 0%, #ff2a6d 100%)",
            color: "white",
          }}
        >
          New Place
        </Button>
      </Stack>

      <Box sx={{ maxWidth: "72rem", mx: "auto" }}>
        {isLoading && (
          <Stack alignItems="center" sx={{ mt: 8 }}>
            <CircularProgress size={28} />
          </Stack>
        )}

        {isError && <Alert severity="error">Failed to load events.</Alert>}

        {!isLoading && !isError && places.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 3,
              borderStyle: "dashed",
            }}
          >
            <MapPin size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              No places evaluated yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ask the agent to assess a venue in Chat, or create one here
              directly.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Plus size={16} />}
              onClick={() => setFormOpen(true)}
            >
              New Place
            </Button>
          </Paper>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onOpen={() => setSelected(place)}
              onDelete={() => deleteMutation.mutate(place.id)}
              deleting={
                deleteMutation.isPending &&
                deleteMutation.variables === place.id
              }
            />
          ))}
        </Box>
      </Box>

      {/* New Place dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitNewPlace}>
          <DialogTitle>Evaluate a new place</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Venue name / address"
                placeholder="Pelican Hill Resort, Newport Beach"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                fullWidth
                autoFocus
                required
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Event date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                />
                <TextField
                  label="Event time (optional)"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>
              {createMutation.isError && (
                <Alert severity="error">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "Failed to evaluate this place."}
                </Alert>
              )}
              {createMutation.isPending && (
                <Alert severity="info" icon={<CircularProgress size={16} />}>
                  Calling the agent to evaluate this venue — this can take up to
                  a minute…
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setFormOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                createMutation.isPending ||
                !venueAddress.trim() ||
                !eventDate.trim()
              }
            >
              {createMutation.isPending ? "Evaluating…" : "Evaluate"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Detail dialog */}
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="md"
      >
        {selected && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>
                {selected.report?.venue_name || selected.venueAddress}
              </span>
              <IconButton onClick={() => setSelected(null)} size="small">
                <X size={18} />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <PlaceDetails place={selected} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={() => deleteMutation.mutate(selected.id)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

function PlaceCard({
  place,
  onOpen,
  onDelete,
  deleting,
}: {
  place: PlaceRecord;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const riskLevel = place.report?.overall_risk_level?.toLowerCase();

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        cursor: place.status === "ready" ? "pointer" : "default",
        transition: "box-shadow 0.15s ease",
        "&:hover": place.status === "ready" ? { boxShadow: 3 } : undefined,
      }}
      onClick={place.status === "ready" ? onOpen : undefined}
    >
      <CardContent
        sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.25 }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ pr: 1 }}>
            {place.report?.venue_name || place.venueAddress}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={16} /> : <Trash2 size={16} />}
          </IconButton>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          color="text.secondary"
        >
          <Calendar size={14} />
          <Typography variant="caption">{place.eventDate}</Typography>
        </Stack>

        {place.venueAddress && place.report?.venue_name && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            color="text.secondary"
          >
            <MapPin size={14} style={{ marginTop: 2 }} />
            <Typography variant="caption">{place.venueAddress}</Typography>
          </Stack>
        )}

        {place.status === "pending" && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">
              Evaluating…
            </Typography>
          </Stack>
        )}

        {place.status === "error" && (
          <Alert
            severity="error"
            sx={{ mt: 1 }}
            icon={<AlertTriangle size={16} />}
          >
            {place.errorMessage || "Evaluation failed."}
          </Alert>
        )}

        {place.status === "ready" && (
          <>
            {riskLevel && (
              <Chip
                size="small"
                label={`${riskLevel} risk`}
                color={RISK_COLOR[riskLevel] ?? "default"}
                sx={{ alignSelf: "flex-start", textTransform: "capitalize" }}
              />
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {place.report?.executive_summary}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PlaceDetails({ place }: { place: PlaceRecord }) {
  const report = place.report;
  const weatherSummary = (place.weatherData?.summary ?? null) as Record<
    string,
    unknown
  > | null;
  const hotels = (place.mapsData?.hotels ?? []) as Array<
    Record<string, unknown>
  >;
  const parking = (place.mapsData?.parking ?? null) as Record<
    string,
    unknown
  > | null;
  const riskLevel = report?.overall_risk_level?.toLowerCase();

  if (place.status !== "ready" || !report) {
    return (
      <Typography variant="body2" color="text.secondary">
        {place.status === "error" ? place.errorMessage : "Still evaluating…"}
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} alignItems="center">
        {riskLevel && (
          <Chip
            size="small"
            label={`${riskLevel} risk`}
            color={RISK_COLOR[riskLevel] ?? "default"}
            sx={{ textTransform: "capitalize" }}
          />
        )}
        <Typography variant="caption" color="text.secondary">
          {place.eventDate}
        </Typography>
      </Stack>

      <Section title="Executive Summary" icon={<ShieldAlert size={16} />}>
        <Typography variant="body2">{report.executive_summary}</Typography>
      </Section>

      <Section title="Weather Risk" icon={<Cloud size={16} />}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {report.weather_risk?.summary}
        </Typography>
        <BulletList items={report.weather_risk?.points} />
        {weatherSummary && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            {String(weatherSummary.temp_c ?? "")}°C ·{" "}
            {String(weatherSummary.humidity_pct ?? "")}% humidity ·{" "}
            {Array.isArray(weatherSummary.conditions) &&
            weatherSummary.conditions[0]
              ? String(
                  (weatherSummary.conditions[0] as Record<string, unknown>)
                    .description ?? "",
                )
              : ""}
          </Typography>
        )}
      </Section>

      <Section title="Venue & Logistics" icon={<Hotel size={16} />}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {report.venue_logistics?.summary}
        </Typography>
        <BulletList items={report.venue_logistics?.points} />
        {hotels.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography
              variant="caption"
              fontWeight="bold"
              color="text.secondary"
            >
              Nearby hotels
            </Typography>
            <BulletList
              items={hotels.map((h) => `${h.name ?? ""} — ${h.distance ?? ""}`)}
            />
          </Box>
        )}
        {parking?.summary ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            sx={{ mt: 1.5 }}
          >
            <SquareParking size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              {String(parking.summary)}
            </Typography>
          </Stack>
        ) : null}
      </Section>

      <Section
        title="Critical Failure Points"
        icon={<AlertTriangle size={16} />}
      >
        <BulletList items={report.critical_failure_points} />
      </Section>

      <Section title="Contingency Plan">
        <BulletList items={report.contingency_plan} />
      </Section>

      <Section title="Weather Windows">
        <BulletList items={report.weather_windows} />
      </Section>
    </Stack>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        {icon}
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      {children}
    </Box>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
      {items.map((item, i) => (
        <Typography component="li" variant="body2" key={i} sx={{ mb: 0.5 }}>
          {item}
        </Typography>
      ))}
    </Box>
  );
}
