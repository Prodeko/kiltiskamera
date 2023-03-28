FROM 'sucwangsr/janus-webrtc-gateway-docker:20230127'

RUN apt-get install -y nginx
RUN mv /etc/nginx/mime.types /usr/local/nginx/mime.types

CMD ["sh", "-c","nginx -c /usr/local/nginx/nginx.conf & /usr/local/bin/janus -F /usr/local/etc/janus"]
