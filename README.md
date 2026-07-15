IT-SURVEY V3 — คู่มือติดตั้งด่วน
=================================

ค่าที่ใส่ให้แล้ว
- Google Sheet ID:
  1ouT1I_ZKDhdaqH8kpkoP-fDqN1GZh1AovbPwjjKL8zI
- LIFF ID:
  2010431720-qlfYB6de

ส่วนที่ 1: Google Apps Script
-----------------------------
1. เปิด Google Sheet เดิม
2. ไปที่ Extensions > Apps Script
3. ลบไฟล์ทดสอบเก่าหรือสร้าง Project ใหม่
4. สร้างไฟล์ตามโฟลเดอร์ GAS แล้ววางโค้ดให้ตรงชื่อ:
   - 00_Config.gs
   - 01_Setup.gs
   - 02_API.gs
   - 03_Response.gs
   - 04_Dashboard.gs
   - Code.gs
5. เลือกฟังก์ชัน setupSystem แล้วกด Run
6. อนุญาตสิทธิ์ Google
7. กลับไปดู Google Sheet จะมีชีทและข้อมูล Master ถูกสร้างให้อัตโนมัติ
8. ไปที่ Deploy > New deployment
9. เลือก Web app
10. Execute as: Me
11. Who has access: Anyone
12. กด Deploy แล้วคัดลอก URL ที่ลงท้ายด้วย /exec

ส่วนที่ 2: GitHub
-----------------
1. เปิดไฟล์ GitHub/js/config.js
2. แทนที่ข้อความ:
   PASTE_YOUR_GAS_WEB_APP_EXEC_URL_HERE
   ด้วย URL /exec ที่ได้จาก GAS
3. อัปโหลดไฟล์ทั้งหมดภายในโฟลเดอร์ GitHub ไปยัง Repository
4. ตรวจสอบ GitHub Pages:
   Settings > Pages > Deploy from a branch > main / root
5. เปิด URL GitHub Pages เพื่อทดสอบ

ส่วนที่ 3: LINE LIFF
--------------------
1. เปิด LINE Developers Console
2. เปิด LIFF App ID 2010431720-qlfYB6de
3. Endpoint URL = URL GitHub Pages ของระบบนี้
4. Scope เปิด profile และ openid
5. เปิด LIFF URL เพื่อทดสอบ

การทดสอบขั้นต่ำ
---------------
1. เปิดผ่าน LIFF
2. ต้องเห็นชื่อ LINE ด้านบน
3. เลือกหน่วยงาน ตำแหน่ง อายุงาน และคะแนนครบ 15 ข้อ
4. กดส่ง
5. ตรวจ Response_Header ต้องเพิ่ม 1 แถว
6. ตรวจ Response_Detail ต้องเพิ่ม 15 แถว
7. กลับมาเปิดใหม่ ต้องโหลดคำตอบเดิมและแก้ไขได้
8. เปิด Tab ข้อมูลสถิติ ต้องเห็น Dashboard

หมายเหตุ
-------
- ฟังก์ชัน setupSystem() จะเขียนข้อมูล Master ใหม่ใน Department, Position,
  Topic_Master, SubTopic_Master และ Setting
- ระบบไม่ลบข้อมูลใน Response_Header, Response_Detail และ Response_History
- Dashboard แสดงเฉพาะข้อมูลรวม ไม่เปิดเผยรายชื่อผู้ตอบ
