# Universal Runner for UniDeploy Sandbox
# Supports Node.js, Python, and Go based on runtime detection

FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install common dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    golang \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Create workspace
WORKDIR /app

# Add a startup script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# User code will be mounted or cloned into /app
# Environment variables like BUILD_COMMAND and START_COMMAND will drive execution

ENTRYPOINT ["/entrypoint.sh"]
