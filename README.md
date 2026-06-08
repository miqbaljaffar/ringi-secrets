Spesifikasi Sistem: Manajemen Dokumen Ringi (稟議書管理)

1. Ringkasan (概要)

Tujuan dari sistem ini adalah untuk mengelola informasi pengajuan (aplikasi) dan persetujuan dokumen Ringi (Persetujuan Internal).

2. Fitur (機能)

Pendaftaran dan penayangan konten Ringi, persetujuan, dan pencarian.

Beralih rute persetujuan (approval route) berdasarkan klasifikasi atau nominal jumlah.

3. Lingkungan Sistem (使用言語・環境)

Komponen

Teknologi yang Digunakan

Frontend

HTML, CSS, JavaScript (jQuery, Vue.js)

Backend

PHP 8.x

Database

MySQL 8.0

Version Control

Git (Berbagi via FTP)

Informasi Koneksi Database

Nama Server: mysql320.phy.lolipop.lan

Nama Database: LAA1611970-ringi

Nama Pengguna: LAA1611970

Password: Mhu1FNyK

Collation (照合順序): utf8mb4_general_ci

4. Hak Akses (権限)

Peran (役割)

Kewenangan (権限)

Pengguna Umum (一般ユーザー)

Dapat melihat seluruh dokumen Ringi, membuat pengajuan dokumen baru, menarik kembali (membatalkan) pengajuannya sendiri.

Pemberi Persetujuan (承認者)

Hak Pengguna Umum ditambah kewenangan untuk menyetujui (Approve) atau menolak (Reject) dokumen yang menjadi target persetujuannya.

Administrator (管理者 - Beberapa orang tetap)

Dapat mengisi atau memperbarui kolom "Keterangan" (備考) setelah dokumen diajukan dan disetujui.

5. Definisi Tabel Database (テーブル定義)

5.1 t_common (Dokumen Ringi Biasa / 通常稟議)

No

NAME

KEY

PHYSICAL NAME

TYPE

NULL

DEFAULT

1

No. Ringi

PK

id_doc

char(10)

NO

ARyymmdd01

2

Kategori Bisnis



n_type

tinyint(1)

NO

1

3

Subjek (Judul)



s_title

varchar(30)

NO



4

Batas Waktu (Penyelesaian)



dt_deadline

date

NO



5

Ringkasan, Alasan



s_overview

text

NO



6

Dokumen Lampiran



s_file

varchar(50)

YES



7

Keterangan



s_memo

varchar(255)

YES



8

Tanggal Pengajuan



ts_applied

timestamp

NO

NOW()

9

Pembuat Pengajuan

FK

s_applied

char(4)

NO



10

Tanggal Disetujui 1



dt_approved_1

datetime

YES



11

Pemberi Persetujuan 1

FK

s_approved_1

char(4)

NO



12

Tanggal Disetujui 2



dt_approved_2

datetime

YES



13

Pemberi Persetujuan 2

FK

s_approved_2

char(4)

YES



14

Tanggal Pengaturan (Confirmed)



dt_confirmed

datetime

YES



15

Tanggal Dihapus (Cancel)



dt_deleted

datetime

YES



16

Tanggal Ditolak (Reject)



dt_rejected

datetime

YES



Catatan: n_type = 1: Divisi / 2: Komite. s_applied, s_approved_1, s_approved_2, s_confirmed terhubung ke v_worker.id_worker.

5.2 t_common_details (Detail Ringi Biasa / 通常稟議詳細)

No

NAME

KEY

PHYSICAL NAME

TYPE

NULL

DEFAULT

1

No. Detail Ringi

PK

id_details

int, auto

NO



2

No. Ringi

FK

n_doc

char(10)

NO



3

ID Kategori (Klasifikasi)

FK

n_category

tinyint

NO



4

Tujuan Pembayaran



s_payer

varchar(255)

NO



5

Nominal (Jumlah)



n_amount

int

NO



Catatan: t_common_details.n_doc = t_common.id_doc. n_category = tm_category.id_category.

5.3 t_tax (Ringi Kontrak Pajak / 税務契約稟議)

No

NAME

KEY

PHYSICAL NAME

TYPE

NULL

DEFAULT

1

ID Ringi

PK

id_doc

char(10)

NO

CTyymmdd01

2

Tipe Perusahaan/Individu



n_type

tinyint(1)

NO



3

Nama Perusahaan / Toko



s_name

varchar(100)

NO



4

Furigana Perusahaan/Toko



s_kana

varchar(100)

NO



5

Tanggal Pendirian



dt_establishment

date

YES



6

Modal (Capital)



n_capital

int

YES



7

Periode Sebelumnya



n_before

int

YES



8

Nama Industri



s_industry

varchar(50)

NO



9

Kode Industri

FK

s_industry_type

char(4)

NO



10

Kode Industri (OMS)



s_industry_oms

char(4)

NO



11

Tipe Deklarasi Pajak



s_declaration_type

char(1)

NO



12

Bulan Penutupan (Closing)



n_closing_month

tinyint(2)

NO



13

Tempat Pembayaran Pajak



n_tax_place

tinyint(1)

NO



14

Kantor Pajak Yurisdiksi



s_tax_office

varchar(20)

NO



15

No. Pembayar Pajak



s_tax_num

char(8)

NO



16

Kode Pos Kantor



s_office_pcode

char(7)

NO



17

Alamat Kantor



s_office_address

varchar(100)

NO



18

Alamat Kantor (Nama Gedung)



s_office_address2

varchar(100)

YES



19

Telp Kantor



s_office_tel

varchar(13)

NO



20

Tujuan Surat



n_send_to

tinyint(1)

NO



21

Tujuan Surat (Lainnya)



s_send_to_others

varchar(100)

YES



22

Nama Perwakilan



s_rep_name

varchar(30)

NO



23

Furigana Perwakilan



s_rep_kana

varchar(30)

NO



24

Jabatan Perwakilan



s_rep_title

tinyint(1)

NO



25

Jabatan Perwakilan (Lainnya)



s_rep_title_others

varchar(30)

YES



26

Tgl Lahir Perwakilan



dt_rep_birth

date

NO



27

Kode Pos Rumah Perwakilan



s_rep_pcode

char(7)

NO



28

Alamat Rumah Perwakilan



s_rep_address

varchar(100)

NO



29

Alamat Rumah (Gedung)



s_rep_address2

varchar(100)

YES



30

Telp Rumah Perwakilan



s_rep_tel

varchar(13)

NO



31

Email Perwakilan



s_rep_email

varchar(100)

NO



32

Pemberitahuan Mulai E-Filing



n_e_filing

tinyint(1)

NO



33

Alasan Mulai E-Filing



s_e_filing_reason

text

YES



34

ID Pengguna Pajak Nasional



s_national_tax_id

char(16)

NO



35

PIN Pajak Nasional



s_national_tax_pw

varchar(50)

NO



36

ID Pengguna Pajak Daerah



s_local_tax_id

char(11)

YES



37

PIN Pajak Daerah



s_local_tax_pw

varchar(16)

YES



38

Total Aset (Periode Lalu)



n_pre_total

int

NO



39

Pendapatan (Periode Lalu)



n_pre_sales

int

NO



40

Utang Keuangan (Lalu)



n_pre_debt

int

NO



41

Laba Bersih (Periode Lalu)



n_pre_income

int

NO



42

Jumlah Karyawan (Lalu)



n_pre_workers

int

NO



43

Pajak Konsumsi



n_comsumption_tax

tinyint(1)

NO



44

Status Perdagangan



n_trade

tinyint(1)

NO

0

45

Status Perusahaan Afiliasi



n_affiliated_company

tinyint(1)

NO

0

46

Status Akuntansi Mandiri



n_self_accounting

tinyint(1)

NO



47

Akuntansi Mandiri (Lainnya)



s_self_accounting_others

varchar(50)

YES



48

Aplikasi Akuntansi



n_accounting_apps

tinyint(1)

NO



49

Aplikasi Akuntansi (Lain)



s_accounting_apps_others

varchar(100)

YES



50

Buku yang dibuat



s_books

varchar(30)

NO



51

Buku yang dibuat (Lainnya)



s_books_others

varchar(100)

YES



52

Jumlah Slip per Bulan



n_slip_count

int

NO



53

Ketersediaan Staf Akuntansi



n_accounting_staff

tinyint(1)

NO



54

Nama KAPP Sebelumnya



s_pre_accountant

varchar(50)

NO



55

Tipe Keterlibatan Sebelumnya



n_pre_account_type

tinyint(1)

YES



56

Fee Akuntansi Sebelumnya



n_rewards_account

int

YES



57

Fee Pajak Sebelumnya



n_rewards_tax

int

YES



58

Fee Tahunan Sebelumnya



n_rewards_yearly

int

YES



59

Tipe Keterlibatan Saat Ini



n_account_type

tinyint(1)

NO



60

Ringkasan Kontrak



s_contract_overview

text

YES



61

Tanggal Mulai Terlibat



dt_contract_start

date

NO



62

PIC Pra-Kontrak (Pembuka)



s_incharge_bigin

varchar(50)

NO



63

PIC Pra-Kontrak (Penutup)



s_incharge_close

varchar(50)

NO



64

PIC Pelanggan

FK

s_incharge

char(4)

NO



65

Referensi (Pengenal)



s_introducer

varchar(50)

NO



66

Tipe Referensi



n_introducer_type

tinyint(1)

NO



67

Tipe Referensi (Lainnya)



s_introducer_type_others

varchar(50)

YES



68

Latar Belakang / Alasan



s_situation

text

NO



69

Keterangan



s_memo

varchar(255)

YES



70

Tanggal Pengajuan



ts_applied

timestamp

NO

NOW()

71

Pembuat Pengajuan

FK

s_applied

char(4)

NO



72

Tanggal Disetujui 1



dt_approved_1

datetime

YES



73

Pemberi Persetujuan 1

FK

s_approved_1

char(4)

NO



74

Tanggal Disetujui 2



dt_approved_2

datetime

YES



75

Pemberi Persetujuan 2

FK

s_approved_2

char(4)

YES



76

Tanggal Penerimaan Kontrak



dt_confirmed

datetime

YES



77

Penerima Kontrak

FK

s_confirmed

char(4)

NO



78

Tanggal Dihapus



dt_deleted

datetime

YES



79

Tanggal Ditolak



dt_rejected

datetime

YES



Catatan: s_industry_type = gabungan tm_industry_code.s_cat_1, s_cat_2, s_cat_3. s_incharge, s_applied, s_approved_1, s_approved_2, s_confirmed terhubung ke v_worker.id_worker.

5.4 t_others (Ringi Kontrak Lainnya - Klien / その他契約稟議)

No

NAME

KEY

PHYSICAL NAME

TYPE

NULL

DEFAULT

1

No. Ringi

PK

id_doc

char(10)

NO

COyymmdd01

2

Nama Perusahaan/Toko



s_name

varchar(100)

NO



3

Furigana Perusahaan/Toko



s_kana

varchar(100)

NO



4

Nama Industri



s_industry

varchar(50)

NO



5

Kode Industri



s_industry_type

char(4)

NO



6

Kode Pos Kantor



s_office_pcode

char(7)

NO



7

Alamat Kantor



s_office_address

varchar(100)

NO



8

Alamat Kantor (Gedung)



s_office_address2

varchar(100)

YES



9

Telp Kantor



s_office_tel

varchar(13)

NO



10

Tujuan Surat



n_send_to

tinyint(1)

NO



11

Tujuan Surat (Lainnya)



s_send_to_others

varchar(100)

YES



12

Nama Perwakilan



s_rep_name

varchar(30)

NO



13

Furigana Perwakilan



s_rep_kana

varchar(30)

NO



14

Jabatan Perwakilan



s_rep_title

tinyint(1)

NO



15

Jabatan Perwakilan (Lain)



s_rep_title_others

varchar(30)

YES



16

Email Perwakilan



s_rep_email

varchar(100)

NO



17

Total Aset (Periode Lalu)



n_pre_total

int

NO



18

Penjualan (Periode Lalu)



n_pre_sales

int

NO



19

Utang Keuangan (Lalu)



n_pre_debt

int

NO



20

Laba Bersih (Periode Lalu)



n_pre_income

int

NO



21

Jumlah Karyawan (Lalu)



n_pre_workers

int

NO



22

Pajak Konsumsi



n_comsumption_tax

tinyint(1)

NO



23

Status Perdagangan



n_trade

tinyint(1)

NO

0

24

Perusahaan Afiliasi



n_affiliated_company

tinyint(1)

NO

0

25

Ringkasan Kontrak



s_contract_overview

text

YES



26

Tanggal Mulai Keterlibatan



dt_contract_start

date

NO



27

PIC Pelanggan

FK

s_incharge

char(4)

NO



28

Referensi (Pengenal)



s_introducer

varchar(50)

NO



29

Tipe Referensi



n_introducer_type

tinyint(1)

NO



30

Tipe Referensi (Lainnya)



s_introducer_type_others

varchar(50)

YES



31

Latar Belakang / Alasan



s_situation

text

NO



32

Keterangan



s_memo

varchar(255)

YES



33

Tanggal Pengajuan



ts_applied

timestamp

NO

NOW()

34

Pembuat Pengajuan

FK

s_applied

char(4)

NO



35

Tanggal Disetujui 1



dt_approved_1

datetime

YES



36

Pemberi Persetujuan 1

FK

s_approved_1

char(4)

NO



37

Tanggal Disetujui 2



dt_approved_2

datetime

YES



38

Pemberi Persetujuan 2

FK

s_approved_2

char(4)

YES



39

Tgl Penerimaan Kontrak



dt_confirmed

datetime

YES



40

Penerima Kontrak

FK

s_confirmed

char(4)

NO



41

Tanggal Dihapus



dt_deleted

datetime

YES



42

Tanggal Ditolak



dt_rejected

datetime

YES



5.5 t_vendors (Ringi Kontrak Vendor/Transaksi / 取引先契約稟議)

No

NAME

KEY

PHYSICAL NAME

TYPE

NULL

DEFAULT

1

No. Ringi

PK

id_doc

char(10)

NO

CVyymmdd01

2

Nama Vendor/Perusahaan



s_name

varchar(100)

NO



3

Furigana Vendor/Prshn



s_kana

varchar(100)

NO



4

Kode Pos Kantor



s_office_pcode

char(7)

NO



5

Alamat Kantor



s_office_address

varchar(100)

NO



6

Alamat Kantor (Gedung)



s_office_address2

varchar(100)

YES



7

Telp Kantor



s_office_tel

varchar(13)

NO



8

Tujuan Surat



n_send_to

tinyint(1)

NO



9

Tujuan Surat (Lainnya)



s_send_to_others

varchar(100)

YES



10

Nama Perwakilan



s_rep_name

varchar(30)

NO



11

Furigana Perwakilan



s_rep_kana

varchar(30)

NO



12

Jabatan Perwakilan



s_rep_title

tinyint(1)

NO



13

Jabatan Perwakilan (Lain)



s_rep_title_others

varchar(30)

YES



14

Ringkasan Kontrak



s_contract_overview

text

YES



15

Latar Belakang / Alasan



s_situation

text

NO



16

Keterangan



s_memo

varchar(255)

YES



17

Tanggal Pengajuan



ts_applied

timestamp

NO

NOW()

18

Pembuat Pengajuan

FK

s_applied

char(4)

NO



19

Tanggal Disetujui 1



dt_approved_1

datetime

YES



20

Pemberi Persetujuan 1

FK

s_approved_1

char(4)

NO



21

Tanggal Disetujui 2



dt_approved_2

datetime

YES



22

Pemberi Persetujuan 2

FK

s_approved_2

char(4)

YES



23

Tanggal Penerimaan



dt_confirmed

datetime

YES



24

Penerima Kontrak

FK

s_confirmed

char(4)

NO



25

Tanggal Dihapus



dt_deleted

datetime

YES



26

Tanggal Ditolak



dt_rejected

datetime

YES



5.6 Tabel Master & View

tm_category (Master Klasifikasi)

id_category (int, auto, PK, NO)

s_category (varchar 3, NO)

dt_delete (date, YES, NULL)

tm_industry_code (Master Kode Standar Industri Jepang)

id_industry (int, PK, NO)

s_industry (varchar 40, NO)

s_cat_1 (char 1, NO) - Klasifikasi Besar

s_cat_2 (char 2, NO) - Klasifikasi Menengah

s_cat_3 (char 1, NO) - Klasifikasi Kecil

v_worker (View Informasi Pegawai) (Dari DB: LAA1611970-workers)

id_worker (char 4, PK, NO)

s_name (varchar 20, NO)

s_kana (varchar 20, NO)

s_department (varchar 10, NO) - Terhubung ke tm_department.id

s_post (varchar 10, YES)

s_committee (varchar 10, YES)

n_chairperson (tinyint 1, NO, 0)

s_email (varchar 50, NO)

n_delete (tinyint 1, NO, 0)

v_committee (View Informasi Komite)

id_committee (int, PK, NO)

s_committee (varchar 30, NO)

dt_start (date, NO)

dt_end (date, YES, NULL)

v_approval_route (View Rute Persetujuan)

id_route (int, auto, PK, NO)

id_worker (char 4, NO)

n_doc_cat (tinyint, NO)

s_approved_1 (char 4, NO)

s_approved_2 (char 4, YES)

dt_start (date, NO)

dt_end (date, YES, NULL)

6. Desain Layar dan Antarmuka (画面設計)

Browser Target: Google Chrome ver. 141.0 ke atas.

Resolusi Layar: Minimal 1366 x 768.

Lebar Maksimal Tabel di Layar: 1200px.

6.1 Halaman Beranda / Daftar Pengajuan (PC)

Area Pencarian:

Tanggal (Ringi biasa: Batas akhir implementasi / Kontrak: Tgl mulai kontrak). Default: Mulai hari ini ~ Kosong (Berlaku terus).

Jenis Ringi (Biasa / Kontrak): Radio Button.

Klasifikasi (Buku, Barang, Pelatihan, Iklan, dll).

Pembuat Pengajuan.

Keyword (Ringi biasa: Subjek / Kontrak: Nama perusahaan/Kana).

Tujuan Pembayaran.

Tab Penayangan:

Semua (すべて): Menampilkan data hari ini ke depan. Urutan waktu: Lama -> Baru.

Menunggu Persetujuan (承認待ち): Urutan: Lama -> Baru.

Disetujui (承認済み): Urutan: Baru -> Lama.

Ditolak/Ditarik (否認・取下): Urutan: Baru -> Lama.

Butuh Persetujuan (要承認): Target rute diri sendiri. Menampilkan Badge jumlah antrean persetujuan. Urutan: Lama -> Baru.

Aturan Visual:

Nominal uang wajib diformat pemisah koma 3 digit.

Tampilan "Item" dipotong menggunakan "..." jika melebihi lebar.

6.2 Aturan Input Form (Form Specifications)

(Keterangan: Teks Merah/Tanda Bintang berarti Wajib Diisi (Required))

Form A: Ringi Biasa (通常稟議)

Nama Kolom

Format HTML/UI

Catatan / Aturan

No. Ringi

-

Otomatis: "AR" + "YYMMDD" + "Urutan 2 digit"

Pembuat

-

Tampil otomatis berdasarkan User Login

Tgl Pengajuan

-

Form Baru: Hari ini / Read-mode: Tanggal dibuat

Divisi/Kategori

input[type=radio]

1: Divisi, 2: Komite. Otomatis ikut profil user.

Subjek

input[type=text]

-

Batas Waktu

input[type=date]

-

Ringkasan/Alasan

textarea

Pesan Bantuan: "Tuliskan rincian barang, jumlah, dll"

Total Nominal

-

Kalkulasi total baris tabel "Klasifikasi/Tujuan"

Klasifikasi

select

Dropdown dari tm_category

Tujuan Bayar

input[type=text]

-

Nominal

input[type=number]

Pesan: "Termasuk pajak, jika bulanan tulis total 1 tahun"

Dok. Lampiran

radio & text

Pilihan: Anggaran/Estimasi/Brosur/Lainnya. (Buka input teks jika Lainnya).

Upload File

input[type=file]

Simpan nama file asli. Aturan rute (Divisi = 5, Komite = 6).

Status

-

Watermark Transparan (Belum disetujui, Disetujui 認 (dalam lingkaran), Ditolak 否認, Ditarik 取下).

Tombol Aksi

-

Pembuat: [Ajukan], [Tarik Kembali], [Selesai]. Approver: [Setujui], [Tolak]. Admin: [Perbarui Catatan].

Form B: Kontrak Pajak (Perusahaan / Individu)

Nama Kolom

Format HTML/UI

Catatan / Aturan

No. Ringi

-

Otomatis: "CT" + "YYMMDD" + "Urutan 2 digit"

Tipe Perusahaan

input[type=radio]

1: Badan/Perusahaan / 2: Individu

Nama Perusahaan

input[type=text]

-

Furigana

input[type=text]

Auto-fill dengan plugin jquery.autoKana.js

Tgl Berdiri

input[type=date]

Menyediakan input Kalender Masehi/Jepang (Otomatis menyesuaikan sebelahnya). Wajib untuk perusahaan.

Modal / Capital

input[type=number]

Wajib untuk perusahaan.

Kode Industri

text x3

Pilihan berjenjang (Kategori Besar A-T, Menengah 01-99, Kecil 0-9).

Tipe Deklarasi

input[type=radio]

Biru / Putih

Kode Pos Kantor

number x2

Input dipisah 3 digit & 4 digit (0 awalan). Masuk ke DB: 7 digit flat misal 4100022.

Alamat Kantor

input[type=text]

Auto-fill dari kode pos dengan ajaxzip3.js.

Telepon Kantor

number x3

Input 3 bagian terpisah, digabung di DB pakai tanda "-".

Tujuan Surat

input[type=radio]

1: Kantor / 2: Rumah / 9: Lainnya (Menampilkan input teks).

Data Perwakilan

text, date, radio

Nama lengkap dipecah input (Marga, Nama Depan). Furigana pakai autoKana.js. Telepon rumah dan email bisa dipilih "Ada/Tidak ada" (Jika tidak, simpan sebagai String "Tidak ada", bukan NULL).

Data e-Filing

radio, text

ID/PIN Pajak Nasional (16 digit, bisa nol di depan).

Info Keuangan

number

Aset, Pendapatan, Laba bersih periode sebelumnya.

Akuntansi

radio, checkbox

Software akuntansi: TKC/Yayoi/Money Forward/Lainnya. Buku: Cashbook/Deposit/dll (Bisa di-cek ganda/Checkbox).

Riwayat KAPP

radio, number

Info konsultan pajak lama dan total pembayaran fee pajak tahunan masa lalu.

Info Rujukan

text, radio

Tipe Referensi: Klien lama/Bank/Kantor Pajak/dll.

File PDF Estimasi

input[type=file]

Saat diunggah disimpan di server wajib ganti nama fix jadi: 見積書.pdf.

Form C: Kontrak Lainnya (Klien) & Form D: Kontrak Vendor

Aturan form sama dengan form Kontrak Pajak untuk input dasar (AutoKana, Ajaxzip3, format telepon dan kode pos). Penomoran Ringi menggunakan:

COyymmdd01 untuk Klien Lainnya.

CVyymmdd01 untuk Vendor (Transaksi).

Di tabel Kontrak Pajak, Lainnya, dan Vendor, Sistem rute selalu secara otomatis menambahkan ID pegawai 0036 di tahap akhir sebagai penerima kontrak (s_confirmed).

6.3 Layar Smartphone

Layout responsif.

Format Kartu per baris (Card view).

Baris 1: Kategori/Tipe Ringi.

Baris 2: Nama Pembuat, Tgl Diajukan, Nama/Subjek, Ikon Status.

7. Diagram Alir Persetujuan (申請フロー)

flowchart LR
    %% Actors
    User[Pengguna Umum]
    Approver[Pemberi Persetujuan]
    Admin[Administrator]
    DB[(DB)]
    Mail[[Notifikasi Email]]

    %% Flow
    User -->|1. Pembuatan| Draft[Dokumen Draft]
    Draft -->|2. Pengajuan| Apply[Ajukan]
    
    Apply -->|Catat Tgl/Waktu| DB
    Apply -->|Pemberitahuan ke Approver| Mail
    
    Approver -->|3. Konfirmasi| Review[Review]
    Review -->|Disetujui| Approve[Approve]
    Review -->|Ditolak| Reject[Reject]
    
    Approve -->|Catat Tgl/Waktu Disetujui| DB
    Reject -->|Catat Tgl/Waktu Ditolak| DB
    
    Approve -->|Pemberitahuan ke Pembuat| Mail
    Reject -->|Pemberitahuan ke Pembuat| Mail
    
    Approve -->|4. Pengaturan Sistem Luar| Arrange[Pengaturan / Proses Berkas]
    Arrange -->|Simpan Status Selesai| DB
    
    %% Cancel
    Apply -->|Penarikan Pengajuan| Cancel[Tarik Kembali]
    Cancel -->|Catat Tgl/Waktu Dihapus| DB
    
    %% Admin action
    Admin -->|Perbarui Catatan| Note[Update Kolom Keterangan]
    Note -->|Simpan Perubahan| DB
    Note -->|Notif ke Pembuat & Approver| Mail


8. Struktur Direktori dan Autentikasi (ファイル構成 & テスト環境)

8.1 Autentikasi (Login)

URL Pengujian Mockup: https://iw-test.main.jp/ringi/login.html

Login sebenarnya dijalankan dari sistem Single Sign-On (SSO) Portal Perusahaan.

Data profil pengguna dipegang menggunakan variabel Sesi (Session) UID yang memuat ID Pegawai 4 digit. Dari UID ini sistem mengenali Divisi, Komite, dan hirarki Rute Persetujuan.

8.2 Struktur File Folder

ringi/
├── api/                  # Script backend (API)
├── css/                  # File stylesheet desain
├── js/                   # Javascript / Plugin eksternal
├── pages/                # Tampilan layar
│   └── index.html        # Main dashboard
└── files/                # Root penyimpanan lampiran (PDF)
    ├── ar/               # Direktori Dokumen Ringi Biasa
    │   ├── arxxxxxxxx/   # Folder sesuai ID Dokumen (contoh: ar25120101)
    │   └── ...
    ├── ct/               # Direktori Kontrak Pajak (Pelanggan Pajak)
    │   ├── ctxxxxxxxx/
    │   └── ...
    ├── co/               # Direktori Kontrak Lainnya (Klien)
    │   ├── coxxxxxxxx/
    │   └── ...
    └── cv/               # Direktori Kontrak Vendor/Transaksi
        ├── cvxxxxxxxx/
        └── ...
