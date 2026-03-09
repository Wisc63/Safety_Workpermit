-- =====================================================
-- Safety_Workpermit DB Schema (Rev.2)
-- =====================================================

-- Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'Safety_Workpermit')
BEGIN
    CREATE DATABASE Safety_Workpermit;
END
GO

USE Safety_Workpermit;
GO

-- =====================================================
-- dbo.Personnel
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Personnel') AND type = N'U')
BEGIN
    CREATE TABLE dbo.Personnel (
        ID             INT IDENTITY(1,1) PRIMARY KEY,
        Department     NVARCHAR(5)   NOT NULL,
        Person_Name    NVARCHAR(200) NOT NULL,
        Personnel_Tel  NVARCHAR(10)  NULL
    );
END
GO

-- =====================================================
-- dbo.Contractor
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND type = N'U')
BEGIN
    CREATE TABLE dbo.Contractor (
        ID               INT IDENTITY(1,1) PRIMARY KEY,
        Contractor       NVARCHAR(50)  NOT NULL,
        Worker_Name      NVARCHAR(100) NOT NULL,
        Worker_Tel       NVARCHAR(10)  NULL,
        Worker_Position  NVARCHAR(50)  NOT NULL DEFAULT N'Unknown',
        Training_date    DATE          NULL,
        Training_status  NVARCHAR(20)  NULL
    );
END
GO

-- =====================================================
-- dbo.Work_Permit
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Work_Permit') AND type = N'U')
BEGIN
    CREATE TABLE dbo.Work_Permit (
        Work_Permit_No  NVARCHAR(12)  PRIMARY KEY,
        Created_Date    DATE          NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        Contractor      NVARCHAR(500) NULL,
        Contractor_Tel  NVARCHAR(200) NULL,
        Foreman_Name    NVARCHAR(500) NULL,
        Request_For     NVARCHAR(200) NOT NULL,
        Area            NVARCHAR(100) NOT NULL,
        Start_Date      DATE          NOT NULL,
        End_Date        DATE          NOT NULL,
        Days            INT           NULL,
        Workers         INT           NOT NULL,
        Department      NVARCHAR(5)   NOT NULL,
        Controller      NVARCHAR(60)  NULL,
        Safety_Officer  NVARCHAR(60)  NULL,
        Status          NVARCHAR(20)  NOT NULL DEFAULT N'Open',
        File_Path       NVARCHAR(500) NULL,
        Extension_Count INT           NULL DEFAULT 0
    );
END
GO

-- =====================================================
-- MIGRATION SCRIPT (run once on existing DB)
-- =====================================================

-- ---------- dbo.Contractor ----------

-- 1. Rename Foreman_Name -> Worker_Name
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND name = N'Foreman_Name')
    EXEC sp_rename N'dbo.Contractor.Foreman_Name', N'Worker_Name', N'COLUMN';
GO

-- 2. Rename Forman_Tel -> Worker_Tel (note: original typo was Forman_Tel)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND name = N'Foreman_Tel')
    EXEC sp_rename N'dbo.Contractor.Foreman_Tel', N'Worker_Tel', N'COLUMN';
GO
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND name = N'Forman_Tel')
    EXEC sp_rename N'dbo.Contractor.Forman_Tel', N'Worker_Tel', N'COLUMN';
GO

-- 3. Allow NULL on Worker_Tel
IF EXISTS (SELECT 1 FROM sys.columns c JOIN sys.types t ON c.user_type_id = t.user_type_id
           WHERE c.object_id = OBJECT_ID(N'dbo.Contractor') AND c.name = N'Worker_Tel' AND c.is_nullable = 0)
    ALTER TABLE dbo.Contractor ALTER COLUMN Worker_Tel NVARCHAR(10) NULL;
GO

-- 4. Add Worker_Position if missing
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND name = N'Worker_Position')
BEGIN
    ALTER TABLE dbo.Contractor ADD Worker_Position NVARCHAR(50) NOT NULL DEFAULT N'Unknown';
END
GO

-- 5. Add Training_date if missing
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND name = N'Training_date')
    ALTER TABLE dbo.Contractor ADD Training_date DATE NULL;
GO

-- 6. Add Training_status if missing
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND name = N'Training_status')
    ALTER TABLE dbo.Contractor ADD Training_status NVARCHAR(20) NULL;
GO

-- 7. Set initial Training_status for existing rows
UPDATE dbo.Contractor
SET Training_status = CASE
    WHEN Training_date IS NULL THEN N'Expired'
    WHEN DATEDIFF(day, Training_date, GETDATE()) > 365 THEN N'Expired'
    ELSE N'Allowed'
END;
GO

-- ---------- dbo.Personnel ----------

-- 8. Expand Person_Name to NVARCHAR(200)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Personnel') AND name = N'Person_Name')
    ALTER TABLE dbo.Personnel ALTER COLUMN Person_Name NVARCHAR(200) NOT NULL;
GO

-- 9. Merge Person_LastName into Person_Name (combine first + last into one field)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Personnel') AND name = N'Person_LastName')
BEGIN
    UPDATE dbo.Personnel
    SET Person_Name = LTRIM(RTRIM(Person_Name)) + N' ' + LTRIM(RTRIM(Person_LastName))
    WHERE LTRIM(RTRIM(ISNULL(Person_LastName, N''))) <> N'';
END
GO

-- 10. Drop Person_LastName column
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Personnel') AND name = N'Person_LastName')
    ALTER TABLE dbo.Personnel DROP COLUMN Person_LastName;
GO

-- 11. Add Personnel_Tel if missing
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Personnel') AND name = N'Personnel_Tel')
    ALTER TABLE dbo.Personnel ADD Personnel_Tel NVARCHAR(10) NULL;
GO
