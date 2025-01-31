FROM denoland/deno:2.1.9
EXPOSE 3000
WORKDIR /app
USER deno
COPY deno.json .
COPY deno.lock .
RUN deno install
COPY . .
RUN deno cache main.ts
CMD ["run", "-EN", "main.ts"]
