FROM denoland/deno:2.6.7
EXPOSE 3000
WORKDIR /app
COPY . .
RUN deno install
RUN deno cache main.ts
USER deno
CMD ["run", "-EN", "main.ts"]
