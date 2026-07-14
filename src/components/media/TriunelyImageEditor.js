// src/components/media/TriunelyImageEditor.js
import { Ionicons } from "@expo/vector-icons";
import {
    ImageManipulator,
    SaveFormat,
} from "expo-image-manipulator";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StatusBar,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PREMIUM_CREAM = "#FFFCF5";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";
const EVENT_BROWN = "#7C2D12";
const OLIVE = "#4F633B";
const TEXT = "#1F2933";
const MUTED = "#6B7280";

const CARD_BORDER = "rgba(15, 23, 42, 0.10)";
const EDITOR_BACKGROUND = "#10140D";
const FRAME_BACKGROUND = "#20281B";
const FRAME_BORDER = "rgba(255,255,255,0.94)";
const GRID_LINE = "rgba(255,255,255,0.36)";
const SHADE = "rgba(0,0,0,0.62)";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

const displayFont =
  Platform.OS === "ios" ? "Georgia" : "serif";

function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function getTouchDistance(touches) {
  if (!touches || touches.length < 2) {
    return 0;
  }

  const first = touches[0];
  const second = touches[1];

  const dx = second.pageX - first.pageX;
  const dy = second.pageY - first.pageY;

  return Math.sqrt(dx * dx + dy * dy);
}

function EditorButton({
  icon,
  label,
  onPress,
  primary = false,
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: 999,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary
          ? EVENT_AMBER
          : SURFACE,
        borderWidth: 1,
        borderColor: primary
          ? EVENT_AMBER
          : CARD_BORDER,
        opacity: disabled
          ? 0.42
          : pressed
            ? 0.8
            : 1,
      })}
    >
      {label === "Preparing…" ? (
        <ActivityIndicator
          size="small"
          color={primary ? SURFACE : OLIVE}
          style={{ marginRight: 7 }}
        />
      ) : (
        <Ionicons
          name={icon}
          size={18}
          color={primary ? SURFACE : OLIVE}
          style={{ marginRight: 7 }}
        />
      )}

      <Text
        style={{
          color: primary ? SURFACE : TEXT,
          fontSize: 13,
          fontWeight: "900",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TriunelyImageEditor({
  visible,
  imageUri,
  cropMode = "cover",
  title,
  onCancel,
  onChooseDifferent,
  onComplete,
}) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();

  const isLogo =
    cropMode === "logo";

  const isGallery =
    cropMode === "gallery";

  const isStory =
    cropMode === "story";

  const isSquare =
    isLogo || isGallery;

  const availableWidth =
    window.width - 32;

  const availableHeight =
    window.height -
    Math.max(insets.top, 12) -
    Math.max(insets.bottom, 12) -
    270;

  const storyFrameHeight =
    Math.min(
      Math.max(
        availableHeight,
        360
      ),
      620
    );

  const storyFrameWidth =
    storyFrameHeight *
    (9 / 16);

  const frameWidth =
    isStory
      ? Math.min(
          storyFrameWidth,
          availableWidth
        )
      : Math.min(
          availableWidth,
          isSquare ? 390 : 520
        );

  const frameHeight =
    isStory
      ? frameWidth *
        (16 / 9)
      : isSquare
        ? frameWidth
        : frameWidth *
          (7 / 16);

  const [imageSize, setImageSize] = useState({
    width: 0,
    height: 0,
  });

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [loadingImage, setLoadingImage] =
    useState(false);

  const [imageLoadFailed, setImageLoadFailed] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const zoomRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);

  const gestureStartRef = useRef({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const initialPinchDistanceRef = useRef(0);

  const editorTitle =
    title ||
    (isLogo
      ? "Position your logo"
      : isGallery
        ? "Prepare gallery image"
        : isStory
          ? "Prepare your Story"
          : "Position your cover");

  const baseScale = useMemo(() => {
    if (
      !imageSize.width ||
      !imageSize.height
    ) {
      return 1;
    }

    return Math.max(
      frameWidth / imageSize.width,
      frameHeight / imageSize.height
    );
  }, [
    frameHeight,
    frameWidth,
    imageSize.height,
    imageSize.width,
  ]);

  function getDisplayedSize(
    nextZoom = zoomRef.current
  ) {
    if (
      !imageSize.width ||
      !imageSize.height
    ) {
      return {
        width: frameWidth,
        height: frameHeight,
      };
    }

    return {
      width:
        imageSize.width *
        baseScale *
        nextZoom,

      height:
        imageSize.height *
        baseScale *
        nextZoom,
    };
  }

  function clampPosition(
    proposedX,
    proposedY,
    proposedZoom = zoomRef.current
  ) {
    const displayed =
      getDisplayedSize(proposedZoom);

    const maximumX = Math.max(
      0,
      (displayed.width - frameWidth) / 2
    );

    const maximumY = Math.max(
      0,
      (displayed.height - frameHeight) / 2
    );

    return {
      x: clamp(
        proposedX,
        -maximumX,
        maximumX
      ),

      y: clamp(
        proposedY,
        -maximumY,
        maximumY
      ),
    };
  }

  function applyTransform(
    nextZoom,
    nextX,
    nextY
  ) {
    const safeZoom = clamp(
      nextZoom,
      MIN_ZOOM,
      MAX_ZOOM
    );

    const safePosition = clampPosition(
      nextX,
      nextY,
      safeZoom
    );

    zoomRef.current = safeZoom;
    offsetXRef.current = safePosition.x;
    offsetYRef.current = safePosition.y;

    setZoom(safeZoom);
    setOffsetX(safePosition.x);
    setOffsetY(safePosition.y);
  }

  function resetEditor() {
    applyTransform(1, 0, 0);
  }

  useEffect(() => {
    if (!visible || !imageUri) {
      return;
    }

    setLoadingImage(true);
    setImageLoadFailed(false);
    setProcessing(false);

    setImageSize({
      width: 0,
      height: 0,
    });

    zoomRef.current = 1;
    offsetXRef.current = 0;
    offsetYRef.current = 0;

    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);

    Image.getSize(
      imageUri,
      (width, height) => {
        if (!width || !height) {
          setImageLoadFailed(true);
          setLoadingImage(false);
          return;
        }

        setImageSize({
          width,
          height,
        });

        setLoadingImage(false);
      },
      (error) => {
        console.log(
          "TriunelyImageEditor image size error:",
          error
        );

        setImageLoadFailed(true);
        setLoadingImage(false);
      }
    );
  }, [imageUri, visible]);

  useEffect(() => {
    if (
      !imageSize.width ||
      !imageSize.height
    ) {
      return;
    }

    zoomRef.current = 1;
    offsetXRef.current = 0;
    offsetYRef.current = 0;

    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }, [
    frameHeight,
    frameWidth,
    imageSize.height,
    imageSize.width,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder:
          () => true,

        onMoveShouldSetPanResponder:
          () => true,

        onStartShouldSetPanResponderCapture:
          () => true,

        onMoveShouldSetPanResponderCapture:
          () => true,

        onPanResponderGrant: (event) => {
          gestureStartRef.current = {
            zoom: zoomRef.current,
            offsetX: offsetXRef.current,
            offsetY: offsetYRef.current,
          };

          const touches =
            event.nativeEvent?.touches || [];

          initialPinchDistanceRef.current =
            getTouchDistance(touches);
        },

        onPanResponderMove: (
          event,
          gestureState
        ) => {
          const touches =
            event.nativeEvent?.touches || [];

          if (touches.length >= 2) {
            const distance =
              getTouchDistance(touches);

            if (
              !distance ||
              !initialPinchDistanceRef.current
            ) {
              return;
            }

            const pinchScale =
              distance /
              initialPinchDistanceRef.current;

            const nextZoom =
              gestureStartRef.current.zoom *
              pinchScale;

            applyTransform(
              nextZoom,
              gestureStartRef.current.offsetX,
              gestureStartRef.current.offsetY
            );

            return;
          }

          const nextX =
            gestureStartRef.current.offsetX +
            gestureState.dx;

          const nextY =
            gestureStartRef.current.offsetY +
            gestureState.dy;

          applyTransform(
            zoomRef.current,
            nextX,
            nextY
          );
        },

        onPanResponderRelease: () => {
          applyTransform(
            zoomRef.current,
            offsetXRef.current,
            offsetYRef.current
          );

          initialPinchDistanceRef.current = 0;
        },

        onPanResponderTerminate: () => {
          applyTransform(
            zoomRef.current,
            offsetXRef.current,
            offsetYRef.current
          );

          initialPinchDistanceRef.current = 0;
        },

        onPanResponderTerminationRequest:
          () => false,

        onShouldBlockNativeResponder:
          () => true,
      }),
    [
      baseScale,
      frameHeight,
      frameWidth,
      imageSize.height,
      imageSize.width,
    ]
  );

  function changeZoom(amount) {
    applyTransform(
      zoomRef.current + amount,
      offsetXRef.current,
      offsetYRef.current
    );
  }

  async function handleUseImage() {
    if (
      processing ||
      imageLoadFailed ||
      !imageUri ||
      !imageSize.width ||
      !imageSize.height
    ) {
      return;
    }

    try {
      setProcessing(true);

      const totalDisplayScale =
        baseScale * zoomRef.current;

      const displayedWidth =
        imageSize.width *
        totalDisplayScale;

      const displayedHeight =
        imageSize.height *
        totalDisplayScale;

      const imageLeft =
        (frameWidth - displayedWidth) / 2 +
        offsetXRef.current;

      const imageTop =
        (frameHeight - displayedHeight) / 2 +
        offsetYRef.current;

      let originX =
        -imageLeft / totalDisplayScale;

      let originY =
        -imageTop / totalDisplayScale;

      let cropWidth =
        frameWidth / totalDisplayScale;

      let cropHeight =
        frameHeight / totalDisplayScale;

      cropWidth = Math.min(
        cropWidth,
        imageSize.width
      );

      cropHeight = Math.min(
        cropHeight,
        imageSize.height
      );

      originX = clamp(
        originX,
        0,
        Math.max(
          0,
          imageSize.width - cropWidth
        )
      );

      originY = clamp(
        originY,
        0,
        Math.max(
          0,
          imageSize.height - cropHeight
        )
      );

      const context =
        ImageManipulator.manipulate(imageUri);

      context.crop({
        originX: Math.round(originX),
        originY: Math.round(originY),
        width: Math.max(
          1,
          Math.round(cropWidth)
        ),
        height: Math.max(
          1,
          Math.round(cropHeight)
        ),
      });

      if (isLogo) {
        context.resize({
          width: 1000,
          height: 1000,
        });
      } else if (isGallery) {
        context.resize({
          width: 1400,
          height: 1400,
        });
      } else if (isStory) {
        context.resize({
          width: 1080,
          height: 1920,
        });
      } else {
        context.resize({
          width: 1600,
          height: 700,
        });
      }

      const renderedImage =
        await context.renderAsync();

      const result =
        await renderedImage.saveAsync({
          compress: 0.9,
          format: SaveFormat.JPEG,
        });

      if (!result?.uri) {
        throw new Error(
          "No edited image file was created."
        );
      }

      onComplete?.({
        uri: result.uri,
        width: result.width,
        height: result.height,

        fileName: isLogo
          ? `partner-logo-${Date.now()}.jpg`
          : isGallery
            ? `partner-gallery-${Date.now()}.jpg`
            : isStory
              ? `triunely-story-${Date.now()}.jpg`
              : `partner-cover-${Date.now()}.jpg`,

        mimeType: "image/jpeg",
        type: "image/jpeg",
        mediaType: "image",
        assetType: "image",
      });
    } catch (error) {
      console.log(
        "TriunelyImageEditor crop error:",
        error
      );

      Alert.alert(
        "Image editor",
        error?.message ||
          "We couldn't prepare this image. Please try another image."
      );
    } finally {
      setProcessing(false);
    }
  }

  const displayedSize =
    getDisplayedSize(zoom);

  const imageLeft =
    (frameWidth - displayedSize.width) / 2 +
    offsetX;

  const imageTop =
    (frameHeight - displayedSize.height) / 2 +
    offsetY;

  const editorReady =
    Boolean(
      imageUri &&
      imageSize.width &&
      imageSize.height &&
      !imageLoadFailed
    );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {
        if (!processing) {
          onCancel?.();
        }
      }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={EDITOR_BACKGROUND}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: EDITOR_BACKGROUND,
          paddingTop: Math.max(
            insets.top,
            12
          ),
          paddingBottom: Math.max(
            insets.bottom,
            12
          ),
        }}
      >
        <View
          style={{
            minHeight: isStory
              ? 76
              : 64,
            paddingTop: isStory
              ? 10
              : 4,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={onCancel}
            disabled={processing}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                "rgba(255,255,255,0.10)",
              borderWidth: 1,
              borderColor:
                "rgba(255,255,255,0.15)",
              opacity: processing
                ? 0.4
                : pressed
                  ? 0.7
                  : 1,
            })}
          >
            <Ionicons
              name="close"
              size={24}
              color={SURFACE}
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
                color: SURFACE,
                fontFamily: displayFont,
                fontSize: 20,
                lineHeight: 25,
                fontWeight: "900",
                textAlign: "center",
              }}
              numberOfLines={2}
            >
              {editorTitle}
            </Text>

            <Text
              style={{
                color:
                  "rgba(255,255,255,0.66)",
                fontSize: 11.5,
                lineHeight: 16,
                fontWeight: "700",
                textAlign: "center",
                marginTop: 3,
              }}
            >
              {isStory
                ? "Move and zoom your photo"
                : "Drag to position • Pinch to zoom"}
            </Text>
          </View>

          <View
            style={{
              width: 42,
              height: 42,
            }}
          />
        </View>

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View
            style={{
              width: frameWidth,
              height: frameHeight,
              backgroundColor:
                FRAME_BACKGROUND,
              borderRadius: isLogo
                ? frameWidth / 2
                : 24,
              overflow: "hidden",
            }}
            {...panResponder.panHandlers}
          >
            {editorReady ? (
              <Image
                source={{
                  uri: imageUri,
                }}
                fadeDuration={0}
                resizeMode="stretch"
                resizeMethod="resize"
                style={{
                  position: "absolute",
                  left: imageLeft,
                  top: imageTop,
                  width: displayedSize.width,
                  height: displayedSize.height,
                }}
                onLoadStart={() => {
                  setLoadingImage(true);
                }}
                onLoad={() => {
                  setLoadingImage(false);
                  setImageLoadFailed(false);
                }}
                onError={(event) => {
                  console.log(
                    "TriunelyImageEditor render error:",
                    event?.nativeEvent
                  );

                  setLoadingImage(false);
                  setImageLoadFailed(true);
                }}
              />
            ) : null}

            {!isLogo && editorReady ? (
              <>
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: frameWidth / 3,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: GRID_LINE,
                  }}
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left:
                      (frameWidth / 3) * 2,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: GRID_LINE,
                  }}
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: frameHeight / 3,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: GRID_LINE,
                  }}
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top:
                      (frameHeight / 3) * 2,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: GRID_LINE,
                  }}
                />
              </>
            ) : null}

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: frameWidth,
                height: frameHeight,
                borderRadius: isLogo
                  ? frameWidth / 2
                  : 24,
                borderWidth: 3,
                borderColor: FRAME_BORDER,
              }}
            />

            {loadingImage ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    "rgba(16,20,13,0.42)",
                }}
              >
                <ActivityIndicator
                  size="large"
                  color={EVENT_AMBER}
                />

                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 13,
                    fontWeight: "900",
                    marginTop: 10,
                  }}
                >
                  Preparing image…
                </Text>
              </View>
            ) : null}

            {imageLoadFailed ? (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  paddingHorizontal: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    FRAME_BACKGROUND,
                }}
              >
                <Ionicons
                  name="image-outline"
                  size={34}
                  color={EVENT_AMBER}
                />

                <Text
                  style={{
                    color: SURFACE,
                    fontSize: 15,
                    fontWeight: "900",
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  This image could not be shown
                </Text>

                <Text
                  style={{
                    color:
                      "rgba(255,255,255,0.66)",
                    fontSize: 12,
                    lineHeight: 17,
                    fontWeight: "700",
                    textAlign: "center",
                    marginTop: 5,
                  }}
                >
                  Choose a different JPG or PNG
                  image.
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={{
              marginTop: 18,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 7,
              backgroundColor:
                "rgba(255,255,255,0.09)",
              borderWidth: 1,
              borderColor:
                "rgba(255,255,255,0.13)",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() =>
                changeZoom(-0.2)
              }
              disabled={
                processing ||
                !editorReady ||
                zoom <= MIN_ZOOM
              }
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                opacity:
                  !editorReady ||
                  zoom <= MIN_ZOOM
                    ? 0.3
                    : pressed
                      ? 0.65
                      : 1,
              })}
            >
              <Ionicons
                name="remove"
                size={23}
                color={SURFACE}
              />
            </Pressable>

            <View
              style={{
                width: 128,
                height: 5,
                borderRadius: 999,
                backgroundColor:
                  "rgba(255,255,255,0.18)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${clamp(
                    ((zoom - MIN_ZOOM) /
                      (MAX_ZOOM -
                        MIN_ZOOM)) *
                      100,
                    0,
                    100
                  )}%`,
                  height: "100%",
                  backgroundColor:
                    EVENT_AMBER,
                }}
              />
            </View>

            <Pressable
              onPress={() =>
                changeZoom(0.2)
              }
              disabled={
                processing ||
                !editorReady ||
                zoom >= MAX_ZOOM
              }
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                opacity:
                  !editorReady ||
                  zoom >= MAX_ZOOM
                    ? 0.3
                    : pressed
                      ? 0.65
                      : 1,
              })}
            >
              <Ionicons
                name="add"
                size={23}
                color={SURFACE}
              />
            </Pressable>
          </View>

        </View>

        <View
          style={{
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 9,
            }}
          >
            <Pressable
              onPress={onChooseDifferent}
              disabled={processing}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 42,
                borderRadius: 15,
                backgroundColor:
                  "rgba(255,255,255,0.09)",
                borderWidth: 1,
                borderColor:
                  "rgba(255,255,255,0.14)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: processing
                  ? 0.4
                  : pressed
                    ? 0.7
                    : 1,
              })}
            >
              <Ionicons
                name="images-outline"
                size={17}
                color={SURFACE}
              />

              <Text
                style={{
                  color: SURFACE,
                  fontSize: 12,
                  fontWeight: "900",
                  marginLeft: 6,
                }}
              >
                Different photo
              </Text>
            </Pressable>

            <Pressable
              onPress={resetEditor}
              disabled={
                processing ||
                !editorReady
              }
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 42,
                borderRadius: 15,
                backgroundColor:
                  "rgba(255,255,255,0.09)",
                borderWidth: 1,
                borderColor:
                  "rgba(255,255,255,0.14)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity:
                  !editorReady ||
                  processing
                    ? 0.35
                    : pressed
                      ? 0.7
                      : 1,
              })}
            >
              <Ionicons
                name="refresh-outline"
                size={17}
                color={SURFACE}
              />

              <Text
                style={{
                  color: SURFACE,
                  fontSize: 12,
                  fontWeight: "900",
                  marginLeft: 6,
                }}
              >
                Reset
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
            }}
          >
            <View style={{ flex: 1.14 }}>
              <EditorButton
                icon="checkmark-circle-outline"
                label={
                  processing
                    ? "Preparing…"
                    : isLogo
                      ? "Use as Logo"
                      : isGallery
                        ? "Use in Gallery"
                        : isStory
                          ? "Use in Story"
                          : "Use as Cover"
                }
                onPress={handleUseImage}
                primary
                disabled={
                  processing ||
                  !editorReady
                }
              />
            </View>
          </View>

          {!isStory ? (
            <View
              style={{
                marginTop: 10,
                borderRadius: 16,
                backgroundColor:
                  "rgba(255,255,255,0.07)",
                borderWidth: 1,
                borderColor:
                  "rgba(255,255,255,0.11)",
                paddingHorizontal: 11,
                paddingVertical: 9,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={
                  isLogo
                    ? "person-circle-outline"
                    : isGallery
                      ? "images-outline"
                      : "image-outline"
                }
                size={17}
                color={EVENT_AMBER}
                style={{
                  marginRight: 8,
                }}
              />

              <Text
                style={{
                  flex: 1,
                  color:
                    "rgba(255,255,255,0.72)",
                  fontSize: 11,
                  lineHeight: 15,
                  fontWeight: "700",
                }}
              >
                {isLogo
                  ? "The circle shows the visible logo area."
                  : isGallery
                    ? "The square shows the gallery thumbnail."
                    : "The grid shows the visible cover area."}
              </Text>
            </View>
          ) : null}
        </View>

        {processing ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: SHADE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                minWidth: 200,
                borderRadius: 24,
                backgroundColor:
                  PREMIUM_CREAM,
                borderWidth: 1,
                borderColor: CARD_BORDER,
                padding: 21,
                alignItems: "center",
              }}
            >
              <ActivityIndicator
                size="large"
                color={EVENT_AMBER}
              />

              <Text
                style={{
                  color: TEXT,
                  fontSize: 15,
                  fontWeight: "900",
                  marginTop: 12,
                }}
              >
                Preparing image…
              </Text>

              <Text
                style={{
                  color: MUTED,
                  fontSize: 12,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                Creating your final crop
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}