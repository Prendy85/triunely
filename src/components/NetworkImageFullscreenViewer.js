// C:\triunely\src\components\NetworkImageFullscreenViewer.js

import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    StatusBar,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BACKGROUND = "#070A07";
const SURFACE = "#FFFFFF";
const EVENT_AMBER = "#B45309";

export default function NetworkImageFullscreenViewer({
  visible,
  imageUrl,
  onClose,
}) {
  const insets =
    useSafeAreaInsets();

  const window =
    useWindowDimensions();

  const previousOrientationLockRef =
    useRef(null);

  const closingRef =
    useRef(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadFailed,
    setLoadFailed,
  ] = useState(false);

  const allowAllOrientations =
    useCallback(async () => {
      try {
        const currentLock =
          await ScreenOrientation.getOrientationLockAsync();

        previousOrientationLockRef.current =
          currentLock;

        const supportsAll =
          await ScreenOrientation.supportsOrientationLockAsync(
            ScreenOrientation.OrientationLock.ALL
          );

        if (supportsAll) {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.ALL
          );
        } else {
          await ScreenOrientation.unlockAsync();
        }
      } catch (error) {
        console.log(
          "NETWORK IMAGE ORIENTATION ENABLE ERROR:",
          error
        );

        try {
          await ScreenOrientation.unlockAsync();
        } catch (fallbackError) {
          console.log(
            "NETWORK IMAGE ORIENTATION FALLBACK ERROR:",
            fallbackError
          );
        }
      }
    }, []);

  const restoreOrientation =
    useCallback(async () => {
      const previousLock =
        previousOrientationLockRef.current;

      previousOrientationLockRef.current =
        null;

      try {
        if (
          previousLock !== null &&
          previousLock !== undefined &&
          previousLock !==
            ScreenOrientation.OrientationLock.UNKNOWN &&
          previousLock !==
            ScreenOrientation.OrientationLock.OTHER
        ) {
          await ScreenOrientation.lockAsync(
            previousLock
          );
        } else {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.DEFAULT
          );
        }
      } catch (error) {
        console.log(
          "NETWORK IMAGE ORIENTATION RESTORE ERROR:",
          error
        );

        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.DEFAULT
          );
        } catch (fallbackError) {
          console.log(
            "NETWORK IMAGE ORIENTATION RESTORE FALLBACK ERROR:",
            fallbackError
          );
        }
      }
    }, []);

  useEffect(() => {
    if (!visible) {
      closingRef.current = false;
      return;
    }

    allowAllOrientations();
  }, [
    allowAllOrientations,
    visible,
  ]);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      setLoadFailed(false);
      return;
    }

    setLoading(true);
    setLoadFailed(false);
  }, [
    imageUrl,
    visible,
  ]);

  const handleClose =
    useCallback(async () => {
      if (closingRef.current) {
        return;
      }

      closingRef.current = true;

      await restoreOrientation();

      onClose?.();
    }, [
      onClose,
      restoreOrientation,
    ]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      supportedOrientations={[
        "portrait",
        "portrait-upside-down",
        "landscape",
        "landscape-left",
        "landscape-right",
      ]}
      onRequestClose={
        handleClose
      }
    >
      <StatusBar
        hidden
        backgroundColor={
          BACKGROUND
        }
        barStyle="light-content"
      />

      <View
        style={{
          flex: 1,
          width: window.width,
          height: window.height,
          backgroundColor:
            BACKGROUND,
        }}
      >
        {imageUrl ? (
          <Image
            source={{
              uri: imageUrl,
            }}
            resizeMode="contain"
            style={{
              width:
                window.width,
              height:
                window.height,
            }}
            onLoadStart={() => {
              setLoading(true);
              setLoadFailed(false);
            }}
            onLoad={() => {
              setLoading(false);
              setLoadFailed(false);
            }}
            onError={(event) => {
              console.log(
                "NETWORK FULLSCREEN IMAGE ERROR:",
                event?.nativeEvent
              );

              setLoading(false);
              setLoadFailed(true);
            }}
          />
        ) : null}

        <Pressable
          onPress={
            handleClose
          }
          hitSlop={12}
          style={({ pressed }) => ({
            position: "absolute",
            top:
              Math.max(
                insets.top,
                12
              ) + 4,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor:
              pressed
                ? "rgba(255,255,255,0.24)"
                : "rgba(0,0,0,0.64)",
            borderWidth: 1,
            borderColor:
              "rgba(255,255,255,0.22)",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Ionicons
            name="close"
            size={26}
            color={SURFACE}
          />
        </Pressable>

        {loading ? (
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
                "rgba(7,10,7,0.28)",
            }}
          >
            <ActivityIndicator
              size="large"
              color={
                EVENT_AMBER
              }
            />
          </View>
        ) : null}

        {loadFailed ? (
          <View
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="image-outline"
              size={42}
              color={
                EVENT_AMBER
              }
            />

            <Text
              style={{
                color: SURFACE,
                fontSize: 16,
                fontWeight: "900",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              This image could not be displayed
            </Text>

            <Pressable
              onPress={
                handleClose
              }
              style={({ pressed }) => ({
                minHeight: 44,
                borderRadius: 999,
                paddingHorizontal: 18,
                backgroundColor:
                  pressed
                    ? "#92400E"
                    : EVENT_AMBER,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 17,
              })}
            >
              <Text
                style={{
                  color: SURFACE,
                  fontSize: 13,
                  fontWeight: "900",
                }}
              >
                Close
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}