FROM node:24-bookworm-slim

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install --only-upgrade -y libpcre2-8-0 \
  && dpkg --compare-versions "$(dpkg-query -W -f='${Version}' libpcre2-8-0)" ge "10.42-1+deb12u1" \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --chown=node:node package.json server.mjs *.html ./
COPY --chown=node:node public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
