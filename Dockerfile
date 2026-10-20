# MOLODST TUSA: static site behind nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css script.js fire.js hero3d.js logo.png hero-poster.jpg hero-video.mp4 photo-1.jpg photo-2.jpg photo-3.jpg merch-1.jpg merch-2.jpg /usr/share/nginx/html/
COPY models /usr/share/nginx/html/models
EXPOSE 80
