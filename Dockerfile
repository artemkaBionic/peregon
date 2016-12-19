FROM alpine

RUN apk add --update nodejs \
                     python
RUN	mkdir -p /kiosk
COPY dist/ /kiosk/
WORKDIR /kiosk/
# Install app dependencies
RUN npm install
EXPOSE 8080

CMD [ "npm", "start" ]