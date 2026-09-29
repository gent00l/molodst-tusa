# MOLODST TUSA: static site behind nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css script.js logo.png hero-poster.jpg hero-video.mp4 photo-1.jpg photo-2.jpg photo-3.jpg /usr/share/nginx/html/
EXPOSE 80
