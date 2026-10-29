-- LS 2.0 analysis tables: Azure SQL schema (T-SQL)
-- Run once, in this order, as an admin.

CREATE TABLE dbo.facilities (
  idx        INT           NOT NULL PRIMARY KEY,           -- stable position, never reuse; new facilities get the next number
  id         NVARCHAR(100) NOT NULL UNIQUE,
  name       NVARCHAR(200) NOT NULL,
  state      NVARCHAR(60)  NOT NULL DEFAULT 'Kaduna',
  lga        NVARCHAR(100) NOT NULL,
  ward       NVARCHAR(100) NOT NULL,
  residence  NVARCHAR(20)  NOT NULL,                        -- Urban or Rural
  type       NVARCHAR(10)  NOT NULL                         -- PHC or HC
);
CREATE INDEX ix_facilities_lga ON dbo.facilities (lga);

CREATE TABLE dbo.pages (
  id         NVARCHAR(60)  NOT NULL PRIMARY KEY,           -- example: em-available
  title      NVARCHAR(200) NOT NULL,
  sheet      NVARCHAR(200) NOT NULL,
  source     NVARCHAR(200) NOT NULL,
  note       NVARCHAR(MAX) NULL,
  sort_order INT           NOT NULL DEFAULT 0
);

CREATE TABLE dbo.off_pages (                                -- sheets not connected yet (shown in the side panel)
  title NVARCHAR(200) NOT NULL, sheet NVARCHAR(200) NOT NULL, note NVARCHAR(MAX) NULL
);

CREATE TABLE dbo.page_columns (
  page_id    NVARCHAR(60)  NOT NULL REFERENCES dbo.pages(id),
  k          INT           NOT NULL,                        -- column position on the page, 0, 1, 2 ...
  grp        NVARCHAR(200) NOT NULL,                        -- indicator group
  opt        NVARCHAR(200) NOT NULL DEFAULT '',             -- option, such as Yes, No, or a medicine name
  kind       CHAR(1)       NOT NULL,                        -- b = Yes/No (count the Yes), n = number (add up)
  period     CHAR(1)       NOT NULL,                        -- w = weekly, r = Round 1 only
  is_default BIT           NOT NULL DEFAULT 0,              -- shown when the page first opens (used on very wide pages)
  PRIMARY KEY (page_id, k)
);

CREATE TABLE dbo.page_weeks (
  page_id NVARCHAR(60) NOT NULL REFERENCES dbo.pages(id),
  wi      INT          NOT NULL,                            -- 0, 1, 2 ... in order
  label   NVARCHAR(20) NOT NULL,                            -- WK2, WK4 ...
  PRIMARY KEY (page_id, wi)
);

-- One row per facility visit (or Round 1 record). wi = -1 means Round 1.
-- A visit counts as "reported" even when every answer on it is empty, so keep the row.
CREATE TABLE dbo.page_visits (
  page_id      NVARCHAR(60) NOT NULL REFERENCES dbo.pages(id),
  facility_idx INT          NOT NULL REFERENCES dbo.facilities(idx),
  wi           INT          NOT NULL,
  PRIMARY KEY (page_id, facility_idx, wi)
);

-- One row per answer. Do not store empty answers.
CREATE TABLE dbo.responses (
  page_id      NVARCHAR(60) NOT NULL,
  facility_idx INT          NOT NULL,
  wi           INT          NOT NULL,
  k            INT          NOT NULL,
  value        FLOAT        NOT NULL,                       -- Yes = 1, No = 0, or the number
  PRIMARY KEY (page_id, facility_idx, wi, k),
  FOREIGN KEY (page_id, facility_idx, wi) REFERENCES dbo.page_visits(page_id, facility_idx, wi),
  FOREIGN KEY (page_id, k) REFERENCES dbo.page_columns(page_id, k)
);
