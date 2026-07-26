// src/context/BackgroundUploadProvider.js
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

const BackgroundUploadContext =
  createContext(null);

function createUploadId() {
  return [
    "upload",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join("-");
}

export function BackgroundUploadProvider({
  children,
}) {
  const [
    uploads,
    setUploads,
  ] = useState([]);

  const startUpload =
    useCallback(
      ({
        title,
        subtitle = "",
        mediaType = null,
        metadata = null,
      }) => {
        const id =
          createUploadId();

        const upload = {
          id,
          title:
            title ||
            "Uploading content",
          subtitle,
          mediaType,
          metadata,

          status: "uploading",
          progress: 0,

          hidden: false,
          errorMessage: "",
          createdAt:
            new Date().toISOString(),
          completedAt: null,
        };

        setUploads(
          (current) => [
            upload,
            ...current,
          ]
        );

        return id;
      },
      []
    );

  const updateUpload =
    useCallback(
      (
        uploadId,
        changes
      ) => {
        if (!uploadId) {
          return;
        }

        setUploads(
          (current) =>
            current.map(
              (upload) =>
                upload.id ===
                uploadId
                  ? {
                      ...upload,
                      ...changes,
                    }
                  : upload
            )
        );
      },
      []
    );

  const setUploadProgress =
    useCallback(
      (
        uploadId,
        progress
      ) => {
        const normalised =
          Math.max(
            0,
            Math.min(
              1,
              Number(progress) ||
                0
            )
          );

        updateUpload(
          uploadId,
          {
            progress:
              normalised,
            status:
              "uploading",
          }
        );
      },
      [updateUpload]
    );

  const completeUpload =
    useCallback(
      (
        uploadId,
        {
          title,
          subtitle,
          metadata,
        } = {}
      ) => {
        updateUpload(
          uploadId,
          {
            status:
              "completed",
            progress: 1,
            errorMessage: "",
            completedAt:
              new Date()
                .toISOString(),

            ...(title
              ? { title }
              : {}),

            ...(subtitle !==
            undefined
              ? { subtitle }
              : {}),

            ...(metadata !==
            undefined
              ? { metadata }
              : {}),
          }
        );
      },
      [updateUpload]
    );

  const failUpload =
    useCallback(
      (
        uploadId,
        error
      ) => {
        const errorMessage =
          typeof error ===
          "string"
            ? error
            : error?.message ||
              "The upload could not be completed.";

        updateUpload(
          uploadId,
          {
            status: "failed",
            errorMessage,
            completedAt:
              new Date()
                .toISOString(),
          }
        );
      },
      [updateUpload]
    );

  const hideUpload =
    useCallback(
      (uploadId) => {
        updateUpload(
          uploadId,
          {
            hidden: true,
          }
        );
      },
      [updateUpload]
    );

  const showUpload =
    useCallback(
      (uploadId) => {
        updateUpload(
          uploadId,
          {
            hidden: false,
          }
        );
      },
      [updateUpload]
    );

  const removeUpload =
    useCallback(
      (uploadId) => {
        setUploads(
          (current) =>
            current.filter(
              (upload) =>
                upload.id !==
                uploadId
            )
        );
      },
      []
    );

  const clearCompletedUploads =
    useCallback(() => {
      setUploads(
        (current) =>
          current.filter(
            (upload) =>
              upload.status !==
                "completed" &&
              upload.status !==
                "failed"
          )
      );
    }, []);

  const visibleUploads =
    useMemo(
      () =>
        uploads.filter(
          (upload) =>
            !upload.hidden
        ),
      [uploads]
    );

  const activeUploads =
    useMemo(
      () =>
        uploads.filter(
          (upload) =>
            upload.status ===
            "uploading"
        ),
      [uploads]
    );

  const value =
    useMemo(
      () => ({
        uploads,
        visibleUploads,
        activeUploads,

        startUpload,
        updateUpload,
        setUploadProgress,
        completeUpload,
        failUpload,
        hideUpload,
        showUpload,
        removeUpload,
        clearCompletedUploads,
      }),
      [
        activeUploads,
        clearCompletedUploads,
        completeUpload,
        failUpload,
        hideUpload,
        removeUpload,
        setUploadProgress,
        showUpload,
        startUpload,
        updateUpload,
        uploads,
        visibleUploads,
      ]
    );

  return (
    <BackgroundUploadContext.Provider
      value={value}
    >
      {children}
    </BackgroundUploadContext.Provider>
  );
}

export function useBackgroundUploads() {
  const context =
    useContext(
      BackgroundUploadContext
    );

  if (!context) {
    throw new Error(
      "useBackgroundUploads must be used inside BackgroundUploadProvider."
    );
  }

  return context;
}