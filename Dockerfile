FROM ubuntu:16.04

RUN apt-get update
RUN apt-get -y install --no-install-recommends nodejs-legacy \
                     python \
		     parted \
		     ntfs-3g \
		     npm \
		     rsync \
			 lldpd


RUN	mkdir -p /kiosk && mkdir -p /srv && mkdir -p /srv/media

COPY dist/ /kiosk/
COPY media/ /srv/media/
WORKDIR /kiosk/
#RUN npm config set strict-ssl false
# Install app dependencies
RUN npm install
COPY start_container.sh /kiosk/start_container.sh
EXPOSE 80

CMD [ "/bin/bash", "/kiosk/start_container.sh" ]