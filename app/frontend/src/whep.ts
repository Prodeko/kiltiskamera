// Minimal WHEP (WebRTC-HTTP Egress Protocol) client for MediaMTX.
// Waits for ICE gathering to finish before sending the offer, so no
// trickle ICE (PATCH requests) is needed.

const ICE_GATHERING_TIMEOUT = 3000; // ms
const CONNECT_TIMEOUT = 8000; // ms

const waitForIceGathering = (pc: RTCPeerConnection) =>
  new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timeout = setTimeout(resolve, ICE_GATHERING_TIMEOUT);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

// Resolves with the peer connection once video is flowing into `video`,
// rejects if the stream could not be started in time.
export const playWhep = async (
  url: string,
  video: HTMLVideoElement
): Promise<RTCPeerConnection> => {
  const pc = new RTCPeerConnection();
  pc.addTransceiver("video", { direction: "recvonly" });

  const connected = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("WHEP connection timed out")),
      CONNECT_TIMEOUT
    );
    pc.addEventListener("track", (event) => {
      video.srcObject = event.streams[0] ?? new MediaStream([event.track]);
    });
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        clearTimeout(timeout);
        resolve();
      } else if (pc.connectionState === "failed") {
        clearTimeout(timeout);
        reject(new Error("WHEP connection failed"));
      }
    });
  });

  try {
    await pc.setLocalDescription(await pc.createOffer());
    await waitForIceGathering(pc);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: pc.localDescription!.sdp,
    });
    if (response.status !== 201) {
      throw new Error(`WHEP request failed with status ${response.status}`);
    }

    await pc.setRemoteDescription({ type: "answer", sdp: await response.text() });
    await connected;
    return pc;
  } catch (error) {
    pc.close();
    throw error;
  }
};
