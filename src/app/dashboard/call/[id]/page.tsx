"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserRole } from "@/hooks/use-user-role";
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";

// Declare the Jitsi IFrame API type on window
declare global {}

export default function CallPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const apiRef = useRef<any>(null);
  const endOnceRef = useRef<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [appointmentId, setAppointmentId] = useState<string>("");
  const { role, user } = useUserRole();
  const displayName = (() => {
    const base = user?.displayName || user?.email || (role === 'doctor' ? 'Doctor' : 'Patient');
    if (role === 'doctor' && base && !/^dr\./i.test(base) && !/^dr\s/i.test(base)) {
      return `Dr. ${base}`;
    }
    return base || '';
  })();

  const demo = search.get("demo") === "true";
  const callPref = (search.get("call") as "voice" | "video") || "video";

  useEffect(() => {
    async function startCall() {
      try {
        setLoading(true);
        setError("");
        const id = params.id;
        setAppointmentId(id);

        // Mark appointment in-progress for our app state
        await fetch(`/api/appointments/${id}/start-call`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callType: callPref })
        }).catch(() => {});

        // Request LiveKit token for this room
        const tokenRes = await fetch(`/api/livekit/token?room=${encodeURIComponent(id)}&role=${encodeURIComponent(role || 'patient')}&mode=${encodeURIComponent(callPref)}`, {
          credentials: "include"
        });
        if (!tokenRes.ok) {
          const e = await tokenRes.json().catch(() => ({} as any));
          throw new Error(e?.error || "Failed to get LiveKit token");
        }
        const tokenData = await tokenRes.json();
        // Store token in ref for use in LiveKitRoom
        apiRef.current = tokenData.token;
      } catch (e: any) {
        setError(e?.message || "Failed to initialize call");
      } finally {
        setLoading(false);
      }
    }

    startCall();

    return () => {
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, callPref, role]);

  async function endCall(navigateBack = true) {
    if (endOnceRef.current) {
      if (navigateBack) router.push("/dashboard/appointments");
      return;
    }
    endOnceRef.current = true;
    try {
      if (appointmentId) {
        await fetch(`/api/appointments/${appointmentId}/end-call`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
      }
    } finally {
      if (navigateBack) router.push("/dashboard/appointments");
    }
  }

  function CallControls({ callPref, onEnd }: { callPref: "voice" | "video"; onEnd: () => void }) {
    const room = useRoomContext();
    const [mode, setMode] = useState<"voice" | "video">(callPref);

    useEffect(() => {
      setMode(callPref);
    }, [callPref]);

    useEffect(() => {
      if (!room) return;
      const enableVideo = mode === "video";
      (async () => {
        try {
          await room.localParticipant.setCameraEnabled(enableVideo);
        } catch (err) {
          console.warn("⚠️ Failed to toggle camera", err);
        }
      })();
    }, [room, mode]);

    const toggleMode = () => {
      setMode((prev) => (prev === "voice" ? "video" : "voice"));
    };

    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
        <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2 rounded-lg border border-background/20 bg-background/70 p-3 shadow-lg backdrop-blur">
          <Button
            size="sm"
            variant={mode === "voice" ? "default" : "outline"}
            onClick={toggleMode}
          >
            {mode === "voice" ? "Switch to Video" : "Switch to Voice"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onEnd}
          >
            End Call
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full p-2">
      <Card className="h-full">
        <CardContent className="h-full p-2 relative">
          {/* LiveKit Room */}

          {apiRef.current && (
            <LiveKitRoom
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
              token={apiRef.current as string}
              connect
              onDisconnected={() => endCall(true)}
              data-lk-theme="default"
              style={{ height: '100%' }}
            >
              <VideoConference />
              <RoomAudioRenderer />
              <CallControls callPref={callPref} onEnd={() => { void endCall(); }} />
            </LiveKitRoom>
          )}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Connecting to the call…</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute top-2 left-2 right-2 z-10">
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded">
                {error}
              </div>
            </div>
          )}
          {/* End Call button moved inside LiveKitRoom to ensure proper disconnect */}
        </CardContent>
      </Card>
    </div>
  );
}
