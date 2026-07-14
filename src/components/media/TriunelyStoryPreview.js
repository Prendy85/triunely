// src/components/media/TriunelyStoryPreview.js
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";

import {
    ActivityIndicator,
    Animated,
    Image,
    PanResponder,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const DEEP_OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER =
  "rgba(15, 23, 42, 0.10)";

const OLIVE_BORDER =
  "rgba(79, 99, 59, 0.20)";

const AMBER_BORDER =
  "rgba(180, 83, 9, 0.22)";

const SOFT_OLIVE_BG =
  "rgba(79, 99, 59, 0.10)";

const SOFT_GOLD_BG =
  "rgba(180, 83, 9, 0.10)";

const DARK_CANVAS = "#11150F";

const displayFont =
  Platform.OS === "ios"
    ? "Georgia"
    : "serif";

const MIN_PREVIEW_SCALE = 0.88;
const MAX_PREVIEW_SCALE = 1.6;

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function getTouchDistance(
  touches
) {
  if (
    !touches ||
    touches.length < 2
  ) {
    return 0;
  }

  const first = touches[0];
  const second = touches[1];

  const dx =
    second.pageX -
    first.pageX;

  const dy =
    second.pageY -
    first.pageY;

  return Math.sqrt(
    dx * dx + dy * dy
  );
}

function ToolButton({
  icon,
  label,
  active = false,
  disabled = false,
  destructive = false,
  onPress,
}) {
  const accent =
    destructive
      ? "#B42318"
      : active
        ? EVENT_AMBER
        : DEEP_OLIVE;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 44,
        borderRadius: 15,
        paddingHorizontal: 11,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor:
          destructive
            ? "rgba(180,35,24,0.08)"
            : active
              ? SOFT_GOLD_BG
              : pressed
                ? SOFT_OLIVE_BG
                : SURFACE,
        borderWidth: 1,
        borderColor:
          destructive
            ? "rgba(180,35,24,0.20)"
            : active
              ? AMBER_BORDER
              : CARD_BORDER,
        opacity:
          disabled
            ? 0.35
            : pressed
              ? 0.8
              : 1,
      })}
    >
      <Ionicons
        name={icon}
        size={18}
        color={accent}
      />

      {label ? (
        <Text
          style={{
            color: accent,
            fontSize: 12,
            fontWeight: "900",
            marginLeft: 6,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function getStickerAppearance(value) {
  const text = String(
    value || ""
  ).toUpperCase();

  if (text.includes("AMEN")) {
    return {
      backgroundColor:
        "rgba(79,99,59,0.94)",
      borderColor:
        "rgba(231,238,220,0.72)",
      icon: "hand-left-outline",
      rotation: "-2deg",
    };
  }

  if (
    text.includes("JESUS") ||
    text.includes("LOVES")
  ) {
    return {
      backgroundColor:
        "rgba(124,45,18,0.94)",
      borderColor:
        "rgba(255,232,218,0.72)",
      icon: "heart-outline",
      rotation: "2deg",
    };
  }

  if (
    text.includes("PRAY") ||
    text.includes("GOD'S GOT")
  ) {
    return {
      backgroundColor:
        "rgba(56,74,48,0.95)",
      borderColor:
        "rgba(226,238,218,0.72)",
      icon: "sparkles-outline",
      rotation: "-1deg",
    };
  }

  if (
    text.includes("HALLELUJAH") ||
    text.includes("BLESSED")
  ) {
    return {
      backgroundColor:
        "rgba(154,90,19,0.95)",
      borderColor:
        "rgba(255,235,192,0.78)",
      icon: "star-outline",
      rotation: "2deg",
    };
  }

  return {
    backgroundColor:
      "rgba(79,99,59,0.94)",
    borderColor:
      "rgba(255,255,255,0.58)",
    icon: "leaf-outline",
    rotation: "0deg",
  };
}

function DraggableStoryOverlay({
  overlay,
  canvasLayout,
  selected,
  onSelect,
  onCommitPosition,
}) {
  const movement =
    useRef(
      new Animated.ValueXY({
        x: 0,
        y: 0,
      })
    ).current;

  const latestMovementRef =
    useRef({
      x: 0,
      y: 0,
    });

  const startPositionRef =
    useRef({
      x: 0,
      y: 0,
    });

  const canvasWidth =
    canvasLayout?.width || 1;

  const canvasHeight =
    canvasLayout?.height || 1;

  const baseX =
    clamp(
      typeof overlay.normalizedX ===
        "number"
        ? overlay.normalizedX
        : 0.5,
      0,
      1
    ) * canvasWidth;

  const baseY =
    clamp(
      typeof overlay.normalizedY ===
        "number"
        ? overlay.normalizedY
        : 0.5,
      0,
      1
    ) * canvasHeight;

  const responder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () => true,

          onMoveShouldSetPanResponder:
            (
              _event,
              gestureState
            ) =>
              Math.abs(
                gestureState.dx
              ) > 2 ||
              Math.abs(
                gestureState.dy
              ) > 2,

          onPanResponderGrant:
            () => {
              onSelect?.(
                overlay.id
              );

              startPositionRef.current = {
                x: baseX,
                y: baseY,
              };

              latestMovementRef.current = {
                x: 0,
                y: 0,
              };

              movement.setValue({
                x: 0,
                y: 0,
              });
            },

          onPanResponderMove:
            (
              _event,
              gestureState
            ) => {
              const nextX =
                gestureState.dx;

              const nextY =
                gestureState.dy;

              latestMovementRef.current = {
                x: nextX,
                y: nextY,
              };

              movement.setValue({
                x: nextX,
                y: nextY,
              });
            },

          onPanResponderRelease:
            () => {
              const finalX =
                clamp(
                  startPositionRef
                    .current.x +
                    latestMovementRef
                      .current.x,
                  0,
                  canvasWidth
                );

              const finalY =
                clamp(
                  startPositionRef
                    .current.y +
                    latestMovementRef
                      .current.y,
                  0,
                  canvasHeight
                );

              movement.setValue({
                x: 0,
                y: 0,
              });

              latestMovementRef.current = {
                x: 0,
                y: 0,
              };

              onCommitPosition?.(
                overlay.id,
                finalX,
                finalY,
                canvasLayout
              );
            },

          onPanResponderTerminate:
            () => {
              movement.setValue({
                x: 0,
                y: 0,
              });

              latestMovementRef.current = {
                x: 0,
                y: 0,
              };
            },

          onPanResponderTerminationRequest:
            () => false,
        }),
      [
        baseX,
        baseY,
        canvasHeight,
        canvasLayout,
        canvasWidth,
        movement,
        onCommitPosition,
        onSelect,
        overlay.id,
      ]
    );

  const scale =
    overlay.scale ?? 1;

  const isEmoji =
    overlay.type === "emoji";

  const isSticker =
    overlay.type === "sticker";

  const isHighlight =
    overlay.type === "text" &&
    overlay.textStyle ===
      "highlight";

  const stickerAppearance =
    getStickerAppearance(
      overlay.value
    );

  return (
    <Animated.View
      {...responder.panHandlers}
      style={{
        position: "absolute",
        left: baseX,
        top: baseY,
        zIndex: selected
          ? 50
          : 20,
        transform: [
          {
            translateX:
              movement.x,
          },
          {
            translateY:
              movement.y,
          },
          {
            translateX:
              isEmoji
                ? -25
                : -45,
          },
          {
            translateY:
              isEmoji
                ? -25
                : -20,
          },
        ],
      }}
    >
      {isEmoji ? (
        <View
          style={{
            minWidth: 54,
            minHeight: 54,
            borderRadius: 20,
            padding: 5,
            alignItems: "center",
            justifyContent:
              "center",
            backgroundColor:
              selected
                ? "rgba(255,252,245,0.18)"
                : "transparent",
            borderWidth:
              selected ? 2 : 0,
            borderColor:
              EVENT_AMBER,
          }}
        >
          <Text
            style={{
              fontSize:
                42 * scale,
              textShadowColor:
                "rgba(0,0,0,0.52)",
              textShadowOffset: {
                width: 0,
                height: 2,
              },
              textShadowRadius: 4,
            }}
          >
            {overlay.value}
          </Text>
        </View>
      ) : isSticker ? (
        <View
          style={{
            transform: [
              {
                rotate:
                  stickerAppearance
                    .rotation,
              },
              {
                scale,
              },
            ],
          }}
        >
          <View
            style={{
              minHeight: 44,
              maxWidth: 260,
              borderRadius: 15,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent:
                "center",
              backgroundColor:
                stickerAppearance
                  .backgroundColor,
              borderWidth:
                selected ? 3 : 1.5,
              borderColor:
                selected
                  ? SURFACE
                  : stickerAppearance
                      .borderColor,
              shadowColor:
                "rgba(0,0,0,0.46)",
              shadowOpacity: 0.34,
              shadowRadius: 7,
              shadowOffset: {
                width: 0,
                height: 3,
              },
              elevation: 6,
            }}
          >
            <Ionicons
              name={
                stickerAppearance.icon
              }
              size={17}
              color={SURFACE}
              style={{
                marginRight: 7,
              }}
            />

            <Text
              style={{
                color: SURFACE,
                fontSize: 15,
                lineHeight: 19,
                fontWeight: "900",
                letterSpacing: 0.7,
                textAlign: "center",
                textShadowColor:
                  "rgba(0,0,0,0.30)",
                textShadowOffset: {
                  width: 0,
                  height: 1,
                },
                textShadowRadius: 2,
              }}
              numberOfLines={2}
            >
              {overlay.value}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={{
            transform: [
              {
                scale,
              },
            ],
            maxWidth: 290,
            borderRadius: 16,
            paddingHorizontal:
              isHighlight
                ? 14
                : 8,
            paddingVertical:
              isHighlight
                ? 9
                : 5,
            backgroundColor:
              isHighlight
                ? "rgba(180,83,9,0.90)"
                : "transparent",
            borderWidth:
              selected ? 2 : 0,
            borderColor:
              selected
                ? SURFACE
                : "transparent",
          }}
        >
          <Text
            style={{
              color: SURFACE,
              fontSize:
                isHighlight
                  ? 20
                  : 18,
              lineHeight:
                isHighlight
                  ? 25
                  : 23,
              fontWeight: "900",
              textAlign: "center",
              textShadowColor:
                "rgba(0,0,0,0.72)",
              textShadowOffset: {
                width: 0,
                height: 2,
              },
              textShadowRadius: 4,
            }}
          >
            {overlay.value}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function TriunelyStoryPreview({
  visible,
  preview,
  insets,

  posting = false,

  overlays = [],
  selectedOverlayId,
  setSelectedOverlayId,

  canvasLayout,
  setCanvasLayout,

  isTypingText,
  setIsTypingText,

  textDraft,
  setTextDraft,

  textStyleMode,
  setTextStyleMode,

  onAddText,
  onAddEmoji,
  onAddSticker,

  onAdjustOverlayScale,
  onDeleteSelectedOverlay,
  onUpdateOverlayPosition,

  getOverlayAbsoluteStyle,

  onCancel,
  onPost,
}) {
  const [
    imageScale,
    setImageScale,
  ] = useState(1);

  const [
    imageOffset,
    setImageOffset,
  ] = useState({
    x: 0,
    y: 0,
  });

  const [
    emojiTrayOpen,
    setEmojiTrayOpen,
  ] = useState(false);

  const [
    stickerTrayOpen,
    setStickerTrayOpen,
  ] = useState(false);

  const imageScaleRef =
    useRef(1);

  const imageOffsetRef =
    useRef({
      x: 0,
      y: 0,
    });

  const canvasRef =
    useRef(null);

  const canvasPagePositionRef =
    useRef({
      x: 0,
      y: 0,
    });

  const gestureStartRef =
    useRef({
      distance: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      pinching: false,
    });

  useEffect(() => {
    if (!visible) {
      return;
    }

    imageScaleRef.current = 1;

    imageOffsetRef.current = {
      x: 0,
      y: 0,
    };

    setImageScale(1);

    setImageOffset({
      x: 0,
      y: 0,
    });

    setEmojiTrayOpen(false);
    setStickerTrayOpen(false);
  }, [
    preview?.uri,
    visible,
  ]);

  function applyImageTransform({
    scale = imageScaleRef.current,
    x = imageOffsetRef.current.x,
    y = imageOffsetRef.current.y,
  }) {
    const safeScale = clamp(
      scale,
      0.82,
      1.8
    );

    const movementLimit =
      120 * Math.max(
        1,
        safeScale
      );

    const safeX = clamp(
      x,
      -movementLimit,
      movementLimit
    );

    const safeY = clamp(
      y,
      -movementLimit,
      movementLimit
    );

    imageScaleRef.current =
      safeScale;

    imageOffsetRef.current = {
      x: safeX,
      y: safeY,
    };

    setImageScale(
      safeScale
    );

    setImageOffset({
      x: safeX,
      y: safeY,
    });
  }

  function resetImageTransform() {
    applyImageTransform({
      scale: 1,
      x: 0,
      y: 0,
    });
  }

  function changeImageScale(
    amount
  ) {
    applyImageTransform({
      scale:
        imageScaleRef.current +
        amount,
      x:
        imageOffsetRef.current.x,
      y:
        imageOffsetRef.current.y,
    });
  }

  const imagePanResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () => true,

          onMoveShouldSetPanResponder:
            () => true,

          onStartShouldSetPanResponderCapture:
            () => false,

          onMoveShouldSetPanResponderCapture:
            (event) =>
              (
                event.nativeEvent
                  ?.touches?.length || 0
              ) >= 2,

          onPanResponderGrant:
            (event) => {
              const touches =
                event.nativeEvent
                  ?.touches || [];

              const distance =
                getTouchDistance(
                  touches
                );

              gestureStartRef.current = {
                distance,
                scale:
                  imageScaleRef.current,
                offsetX:
                  imageOffsetRef
                    .current.x,
                offsetY:
                  imageOffsetRef
                    .current.y,
                pinching:
                  touches.length >= 2,
              };
            },

          onPanResponderMove:
            (
              event,
              gestureState
            ) => {
              const touches =
                event.nativeEvent
                  ?.touches || [];

              if (
                touches.length >= 2
              ) {
                const distance =
                  getTouchDistance(
                    touches
                  );

                if (!distance) {
                  return;
                }

                /*
                 * The gesture normally starts
                 * with one finger. When the
                 * second finger arrives, create
                 * a fresh pinch baseline instead
                 * of comparing against zero.
                 */
                if (
                  !gestureStartRef
                    .current.pinching ||
                  !gestureStartRef
                    .current.distance
                ) {
                  gestureStartRef.current = {
                    distance,
                    scale:
                      imageScaleRef.current,
                    offsetX:
                      imageOffsetRef
                        .current.x,
                    offsetY:
                      imageOffsetRef
                        .current.y,
                    pinching: true,
                  };

                  return;
                }

                const pinchRatio =
                  distance /
                  gestureStartRef
                    .current.distance;

                applyImageTransform({
                  scale:
                    gestureStartRef
                      .current.scale *
                    pinchRatio,
                  x:
                    gestureStartRef
                      .current.offsetX,
                  y:
                    gestureStartRef
                      .current.offsetY,
                });

                return;
              }

              /*
               * A finger has been lifted after
               * pinching. Restart the one-finger
               * drag baseline so the image does
               * not jump.
               */
              if (
                gestureStartRef
                  .current.pinching
              ) {
                gestureStartRef.current = {
                  distance: 0,
                  scale:
                    imageScaleRef.current,
                  offsetX:
                    imageOffsetRef
                      .current.x,
                  offsetY:
                    imageOffsetRef
                      .current.y,
                  pinching: false,
                };

                return;
              }

              applyImageTransform({
                scale:
                  imageScaleRef.current,
                x:
                  gestureStartRef
                    .current.offsetX +
                  gestureState.dx,
                y:
                  gestureStartRef
                    .current.offsetY +
                  gestureState.dy,
              });
            },

          onPanResponderRelease:
            () => {
              gestureStartRef.current = {
                distance: 0,
                scale:
                  imageScaleRef.current,
                offsetX:
                  imageOffsetRef
                    .current.x,
                offsetY:
                  imageOffsetRef
                    .current.y,
                pinching: false,
              };
            },

          onPanResponderTerminate:
            () => {
              gestureStartRef.current = {
                distance: 0,
                scale:
                  imageScaleRef.current,
                offsetX:
                  imageOffsetRef
                    .current.x,
                offsetY:
                  imageOffsetRef
                    .current.y,
                pinching: false,
              };
            },

          onPanResponderTerminationRequest:
            () => false,

          onShouldBlockNativeResponder:
            () => true,
        }),
      []
    );

  if (
    !visible ||
    !preview
  ) {
    return null;
  }

  const isImage =
    preview.mediaType === "image";

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1001,
        backgroundColor:
          PREMIUM_CREAM,
        paddingTop:
          Math.max(
            insets?.top || 0,
            10
          ),
        paddingBottom:
          Math.max(
            insets?.bottom || 0,
            10
          ),
      }}
    >
      {/* Header */}
      <View
        style={{
          minHeight: 58,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={onCancel}
          disabled={posting}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 16,
            backgroundColor:
              pressed
                ? SOFT_OLIVE_BG
                : SURFACE,
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
            alignItems: "center",
            justifyContent:
              "center",
            opacity:
              posting ? 0.4 : 1,
          })}
        >
          <Ionicons
            name="close"
            size={22}
            color={DEEP_OLIVE}
          />
        </Pressable>

        <View
          style={{
            flex: 1,
            minWidth: 0,
            paddingHorizontal: 10,
          }}
        >
          <Text
            style={{
              color: TEXT,
              fontFamily:
                displayFont,
              fontSize: 20,
              lineHeight: 25,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Create your Story
          </Text>

          <Text
            style={{
              color: MUTED,
              fontSize: 11.5,
              lineHeight: 16,
              fontWeight: "700",
              textAlign: "center",
              marginTop: 1,
            }}
          >
            Pinch the image to resize
          </Text>
        </View>

        <View
          style={{
            width: 42,
            height: 42,
          }}
        />
      </View>

      {/* Text editor */}
      {isTypingText ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 10,
          }}
        >
          <View
            style={{
              minHeight: 48,
              borderRadius: 18,
              backgroundColor:
                SURFACE,
              borderWidth: 1,
              borderColor:
                textStyleMode ===
                "highlight"
                  ? AMBER_BORDER
                  : OLIVE_BORDER,
              paddingLeft: 14,
              paddingRight: 5,
              flexDirection: "row",
              alignItems: "center",
              shadowColor:
                "rgba(15,23,42,0.08)",
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: {
                width: 0,
                height: 3,
              },
              elevation: 2,
            }}
          >
            <TextInput
              value={textDraft}
              onChangeText={
                setTextDraft
              }
              placeholder="Write something…"
              placeholderTextColor={
                MUTED
              }
              autoFocus
              style={{
                flex: 1,
                minWidth: 0,
                color: TEXT,
                fontSize: 14,
                fontWeight: "700",
                paddingVertical: 9,
              }}
              onSubmitEditing={
                onAddText
              }
            />

            <Pressable
              onPress={onAddText}
              style={({ pressed }) => ({
                minHeight: 38,
                borderRadius: 14,
                backgroundColor:
                  pressed
                    ? EVENT_BROWN
                    : EVENT_AMBER,
                paddingHorizontal: 14,
                alignItems: "center",
                justifyContent:
                  "center",
              })}
            >
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 12,
                  fontWeight: "900",
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Story canvas */}
      <View
        style={{
          flex: 1,
          minHeight: 230,
          maxHeight: 500,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 5,
        }}
      >
        <View
          ref={canvasRef}
          style={{
            flex: 1,
            minHeight: 220,
            width: "100%",
            maxWidth: 360,
            borderRadius: 26,
            overflow: "hidden",
            backgroundColor:
              DARK_CANVAS,
            borderWidth: 1,
            borderColor:
              "rgba(79,99,59,0.24)",
            shadowColor:
              "rgba(15,23,42,0.18)",
            shadowOpacity: 0.18,
            shadowRadius: 14,
            shadowOffset: {
              width: 0,
              height: 7,
            },
            elevation: 5,
            position: "relative",
          }}
          onLayout={(event) => {
            const layout =
              event.nativeEvent.layout;

            canvasRef.current
              ?.measureInWindow?.(
                (
                  pageX,
                  pageY,
                  width,
                  height
                ) => {
                  canvasPagePositionRef.current = {
                    x: pageX,
                    y: pageY,
                  };

                  setCanvasLayout?.({
                    ...layout,
                    width,
                    height,
                    pageX,
                    pageY,
                  });
                }
              );
          }}
        >
          {isImage ? (
            <View
              style={{
                flex: 1,
                overflow: "hidden",
                backgroundColor:
                  DARK_CANVAS,
              }}
            >
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent:
                    "center",
                  overflow: "hidden",
                }}
                {...imagePanResponder.panHandlers}
              >
                <Image
                  source={{
                    uri: preview.uri,
                  }}
                  resizeMode="cover"
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: [
                      {
                        translateX:
                          imageOffset.x,
                      },
                      {
                        translateY:
                          imageOffset.y,
                      },
                      {
                        scale:
                          imageScale,
                      },
                    ],
                  }}
                />
              </View>

              {/* Image positioning controls */}
              <View
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  bottom: 10,
                  borderRadius: 18,
                  backgroundColor:
                    "rgba(15,20,13,0.78)",
                  borderWidth: 1,
                  borderColor:
                    "rgba(255,255,255,0.14)",
                  paddingHorizontal: 8,
                  paddingVertical: 7,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() =>
                    changeImageScale(
                      -0.08
                    )
                  }
                  disabled={
                    imageScale <= 0.82
                  }
                  style={({ pressed }) => ({
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    backgroundColor:
                      pressed
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(255,255,255,0.09)",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    opacity:
                      imageScale <= 0.82
                        ? 0.35
                        : 1,
                  })}
                >
                  <Ionicons
                    name="remove"
                    size={21}
                    color={SURFACE}
                  />
                </Pressable>

                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: SURFACE,
                      fontSize: 11.5,
                      fontWeight: "900",
                    }}
                  >
                    {Math.round(
                      imageScale * 100
                    )}
                    %
                  </Text>

                  <Text
                    style={{
                      color:
                        "rgba(255,255,255,0.66)",
                      fontSize: 9.5,
                      fontWeight: "700",
                      marginTop: 1,
                    }}
                  >
                    Drag or pinch image
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    changeImageScale(
                      0.08
                    )
                  }
                  disabled={
                    imageScale >= 1.8
                  }
                  style={({ pressed }) => ({
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    backgroundColor:
                      pressed
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(255,255,255,0.09)",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    opacity:
                      imageScale >= 1.8
                        ? 0.35
                        : 1,
                  })}
                >
                  <Ionicons
                    name="add"
                    size={21}
                    color={SURFACE}
                  />
                </Pressable>

                <Pressable
                  onPress={
                    resetImageTransform
                  }
                  style={({ pressed }) => ({
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    marginLeft: 7,
                    backgroundColor:
                      pressed
                        ? "rgba(180,83,9,0.80)"
                        : "rgba(180,83,9,0.55)",
                    alignItems: "center",
                    justifyContent:
                      "center",
                  })}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={SURFACE}
                  />
                </Pressable>
              </View>
            </View>
          ) : (
            <Video
              source={{
                uri: preview.uri,
              }}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor:
                  DARK_CANVAS,
              }}
              resizeMode="contain"
              shouldPlay
              isLooping
              useNativeControls
            />
          )}

          {/* Smooth draggable Story overlays */}
          {canvasLayout
            ? overlays.map(
                (overlay) => (
                  <DraggableStoryOverlay
                    key={overlay.id}
                    overlay={
                      overlay
                    }
                    canvasLayout={
                      canvasLayout
                    }
                    selected={
                      selectedOverlayId ===
                      overlay.id
                    }
                    onSelect={
                      setSelectedOverlayId
                    }
                    onCommitPosition={
                      onUpdateOverlayPosition
                    }
                  />
                )
              )
            : null}
        </View>
      </View>

      {/* Emoji tray */}
      {emojiTrayOpen ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 18,
            backgroundColor:
              SURFACE,
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
            padding: 9,
            flexDirection: "row",
            justifyContent:
              "space-around",
          }}
        >
          {[
            "🙏",
            "❤️",
            "👍",
            "😇",
            "🙌",
            "🕊️",
          ].map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                onAddEmoji?.(emoji);
                setEmojiTrayOpen(
                  false
                );
              }}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor:
                  pressed
                    ? SOFT_GOLD_BG
                    : PREMIUM_CREAM,
                alignItems: "center",
                justifyContent:
                  "center",
              })}
            >
              <Text
                style={{
                  fontSize: 23,
                }}
              >
                {emoji}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Sticker tray */}
      {stickerTrayOpen ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 18,
            backgroundColor:
              SURFACE,
            borderWidth: 1,
            borderColor:
              CARD_BORDER,
            padding: 9,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 7,
          }}
        >
          {[
            {
              value: "AMEN 🙌",
              background:
                DEEP_OLIVE,
            },
            {
              value:
                "GOD IS GOOD",
              background:
                EVENT_AMBER,
            },
            {
              value:
                "PRAYING FOR YOU 🙏",
              background:
                "#5F6F52",
            },
            {
              value:
                "JESUS LOVES YOU 🤍",
              background:
                EVENT_BROWN,
            },
            {
              value:
                "FAITH OVER FEAR",
              background:
                "#44543A",
            },
            {
              value:
                "GRACE UPON GRACE",
              background:
                "#8A5A2B",
            },
            {
              value:
                "GOD'S GOT THIS",
              background:
                "#384A30",
            },
            {
              value:
                "HALLELUJAH ✨",
              background:
                "#9A5A13",
            },
            {
              value:
                "HE IS RISEN",
              background:
                "#536646",
            },
            {
              value:
                "BLESSED 🤍",
              background:
                "#704124",
            },
          ].map((sticker) => (
            <Pressable
              key={sticker.value}
              onPress={() => {
                onAddSticker?.(
                  sticker.value
                );

                setStickerTrayOpen(
                  false
                );
              }}
              style={({ pressed }) => ({
                minHeight: 38,
                borderRadius: 13,
                backgroundColor:
                  pressed
                    ? EVENT_BROWN
                    : sticker.background,
                borderWidth: 1,
                borderColor:
                  "rgba(255,255,255,0.20)",
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: "center",
                justifyContent:
                  "center",
                shadowColor:
                  "rgba(15,23,42,0.16)",
                shadowOpacity: 0.12,
                shadowRadius: 4,
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                elevation: 2,
              })}
            >
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 10.5,
                  lineHeight: 14,
                  fontWeight: "900",
                  letterSpacing: 0.35,
                  textAlign: "center",
                }}
              >
                {sticker.value}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Editing tools */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 7,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <ToolButton
              icon="text-outline"
              label="Text"
              active={isTypingText}
              onPress={() => {
                setEmojiTrayOpen(
                  false
                );

                setStickerTrayOpen(
                  false
                );

                setIsTypingText?.(
                  (value) => !value
                );
              }}
            />
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <ToolButton
              icon="happy-outline"
              label="Emoji"
              active={emojiTrayOpen}
              onPress={() => {
                setIsTypingText?.(
                  false
                );

                setStickerTrayOpen(
                  false
                );

                setEmojiTrayOpen(
                  (value) => !value
                );
              }}
            />
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <ToolButton
              icon="sparkles-outline"
              label="Sticker"
              active={stickerTrayOpen}
              onPress={() => {
                setIsTypingText?.(
                  false
                );

                setEmojiTrayOpen(
                  false
                );

                setStickerTrayOpen(
                  (value) => !value
                );
              }}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 8,
          }}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <ToolButton
              icon="color-fill-outline"
              label="Highlight"
              active={
                textStyleMode ===
                "highlight"
              }
              onPress={() =>
                setTextStyleMode?.(
                  (mode) =>
                    mode ===
                    "highlight"
                      ? "normal"
                      : "highlight"
                )
              }
            />
          </View>

          <ToolButton
            icon="remove"
            disabled={
              !selectedOverlayId
            }
            onPress={() =>
              onAdjustOverlayScale?.(
                -0.1
              )
            }
          />

          <ToolButton
            icon="add"
            disabled={
              !selectedOverlayId
            }
            onPress={() =>
              onAdjustOverlayScale?.(
                0.1
              )
            }
          />

          <ToolButton
            icon="trash-outline"
            destructive
            disabled={
              !selectedOverlayId
            }
            onPress={
              onDeleteSelectedOverlay
            }
          />
        </View>

        {/* Final actions */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 10,
          }}
        >
          <Pressable
            onPress={onCancel}
            disabled={posting}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 50,
              borderRadius: 999,
              backgroundColor:
                pressed
                  ? SOFT_OLIVE_BG
                  : SURFACE,
              borderWidth: 1,
              borderColor:
                CARD_BORDER,
              alignItems: "center",
              justifyContent:
                "center",
              opacity:
                posting ? 0.45 : 1,
            })}
          >
            <Text
              style={{
                color: DEEP_OLIVE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              Cancel
            </Text>
          </Pressable>

          <Pressable
            onPress={onPost}
            disabled={posting}
            style={({ pressed }) => ({
              flex: 1.25,
              minHeight: 50,
              borderRadius: 999,
              backgroundColor:
                pressed
                  ? EVENT_BROWN
                  : EVENT_AMBER,
              alignItems: "center",
              justifyContent:
                "center",
              flexDirection: "row",
              opacity:
                posting ? 0.68 : 1,
            })}
          >
            {posting ? (
              <ActivityIndicator
                size="small"
                color={SURFACE}
                style={{
                  marginRight: 7,
                }}
              />
            ) : (
              <Ionicons
                name="paper-plane-outline"
                size={18}
                color={SURFACE}
                style={{
                  marginRight: 7,
                }}
              />
            )}

            <Text
              style={{
                color: SURFACE,
                fontSize: 13,
                fontWeight: "900",
              }}
            >
              {posting
                ? "Posting…"
                : "Share Story"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}