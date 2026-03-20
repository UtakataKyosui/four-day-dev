FROM mcr.microsoft.com/devcontainers/base:ubuntu AS toolchain-builder

ENV DEBIAN_FRONTEND=noninteractive
ARG USERNAME=utakata
ARG USER_UID=1000
ARG USER_GID=1000

RUN apt-get update && apt-get install -y \
    curl \
    xz-utils \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN if getent passwd "${USER_UID}" >/dev/null; then \
      EXISTING_USER="$(getent passwd "${USER_UID}" | cut -d: -f1)" && \
      EXISTING_GROUP="$(id -gn "${EXISTING_USER}")" && \
      usermod --login "${USERNAME}" --home "/home/${USERNAME}" --move-home "${EXISTING_USER}" && \
      if [ "${EXISTING_GROUP}" != "${USERNAME}" ]; then groupmod --new-name "${USERNAME}" "${EXISTING_GROUP}"; fi; \
    else \
      groupadd --gid "${USER_GID}" "${USERNAME}" && \
      useradd --uid "${USER_UID}" --gid "${USER_GID}" -m -s /bin/bash "${USERNAME}"; \
    fi
USER ${USERNAME}
WORKDIR /home/${USERNAME}

ENV PROTO_HOME="/home/utakata/.proto"
ENV PATH="/home/utakata/.local/bin:$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"

# proto (toolchain manager) + toolchains
RUN curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s -- --no-profile
RUN proto install node lts && \
    proto pin node lts --to global && \
    NODE_BIN=$(ls -d /home/utakata/.proto/tools/node/*/bin | head -1) && \
    "$NODE_BIN/npm" config set prefix "$HOME/.local" && \
    "$NODE_BIN/npm" install -g @google/gemini-cli @openai/codex && \
    proto install rust 1.94.0 && \
    proto install pnpm 10.32.1

USER root
# jj (Jujutsu VCS) - prebuilt binary
RUN JJ_VERSION="0.37.0" && \
    ARCH=$(uname -m) && \
    case "$ARCH" in \
      x86_64)  ARCH_SUFFIX="x86_64-unknown-linux-musl" ;; \
      aarch64) ARCH_SUFFIX="aarch64-unknown-linux-musl" ;; \
      *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;; \
    esac && \
    mkdir -p /opt/toolchain/bin && \
    curl -fsSL "https://github.com/jj-vcs/jj/releases/download/v${JJ_VERSION}/jj-v${JJ_VERSION}-${ARCH_SUFFIX}.tar.gz" \
      | tar xz -C /opt/toolchain/bin ./jj

FROM mcr.microsoft.com/devcontainers/base:ubuntu

ENV DEBIAN_FRONTEND=noninteractive
ARG USERNAME=utakata
ARG USER_UID=1000
ARG USER_GID=1000

RUN apt-get update && apt-get install -y \
    pkg-config \
    sudo \
    xz-utils \
    unzip \
    clang \
    mold \
    && rm -rf /var/lib/apt/lists/*

# gh (GitHub CLI)
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# utakata ユーザーを UID/GID 1000 で揃える
RUN if getent passwd "${USER_UID}" >/dev/null; then \
      EXISTING_USER="$(getent passwd "${USER_UID}" | cut -d: -f1)" && \
      EXISTING_GROUP="$(id -gn "${EXISTING_USER}")" && \
      usermod --login "${USERNAME}" --home "/home/${USERNAME}" --move-home "${EXISTING_USER}" && \
      if [ "${EXISTING_GROUP}" != "${USERNAME}" ]; then groupmod --new-name "${USERNAME}" "${EXISTING_GROUP}"; fi; \
    else \
      groupadd --gid "${USER_GID}" "${USERNAME}" && \
      useradd --uid "${USER_UID}" --gid "${USER_GID}" -m -s /bin/bash "${USERNAME}"; \
    fi \
    && usermod -aG sudo "${USERNAME}" \
    && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME}

COPY --from=toolchain-builder /opt/toolchain/bin/jj /usr/local/bin/jj
COPY --from=toolchain-builder --chown=utakata:utakata /home/utakata/.proto /home/utakata/.proto
COPY --from=toolchain-builder --chown=utakata:utakata /home/utakata/.local /home/utakata/.local
COPY --from=toolchain-builder --chown=utakata:utakata /home/utakata/.cargo /home/utakata/.cargo
COPY --from=toolchain-builder --chown=utakata:utakata /home/utakata/.rustup /home/utakata/.rustup

USER ${USERNAME}
WORKDIR /home/${USERNAME}

# bind mount の親ディレクトリを utakata 所有で事前作成
RUN mkdir -p /home/utakata/.config /home/utakata/.gemini /home/utakata/.codex

ENV PROTO_HOME="/home/utakata/.proto"
ENV CARGO_HOME="/home/utakata/.cargo"
ENV RUSTUP_HOME="/home/utakata/.rustup"
ENV PATH="/home/utakata/.local/bin:$CARGO_HOME/bin:$PROTO_HOME/shims:$PROTO_HOME/bin:/usr/local/bin:$PATH"

# proto / claude の PATH を .bashrc にも追加 (インタラクティブシェル用)
RUN echo 'export PROTO_HOME="$HOME/.proto"' >> ~/.bashrc && \
    echo 'export CARGO_HOME="$HOME/.cargo"' >> ~/.bashrc && \
    echo 'export RUSTUP_HOME="$HOME/.rustup"' >> ~/.bashrc && \
    echo 'export PATH="$HOME/.local/bin:$CARGO_HOME/bin:$PROTO_HOME/shims:$PROTO_HOME/bin:$PATH"' >> ~/.bashrc

# cargo-binstall / cargo-make
RUN cargo install cargo-binstall && \
    cargo binstall cargo-make --no-confirm

# Claude Code CLI (ネイティブインストーラー)
RUN curl -fsSL https://claude.ai/install.sh | bash

# proto管理のnode/npm/npxをシステムPATHからも参照できるようシンボリックリンクを作成
# (Claude Code hookなどbashrcを読まない環境向け)
# - node: proto shimが存在するのでshimへリンク
# - npm/npx: protoはshimを作らないため、globalピンのバージョンディレクトリへ直接リンク
USER root
RUN NODE_VERSION=$(basename "$(ls -d /home/utakata/.proto/tools/node/* | head -1)") \
    && ln -sf /home/utakata/.proto/shims/node /usr/local/bin/node \
    && ln -sf "/home/utakata/.proto/tools/node/${NODE_VERSION}/bin/npm" /usr/local/bin/npm \
    && ln -sf "/home/utakata/.proto/tools/node/${NODE_VERSION}/bin/npx" /usr/local/bin/npx
USER utakata
