-- Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'Safety_Workpermit')
BEGIN
    CREATE DATABASE Safety_Workpermit;
END
GO

USE Safety_Workpermit;
GO

-- Create dbo.Personnel
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Personnel') AND type = 'U')
BEGIN
    CREATE TABLE dbo.Personnel (
        ID            INT IDENTITY(1,1) PRIMARY KEY,
        Department    NVARCHAR(5)  NOT NULL,
        Person_Name   NVARCHAR(30) NOT NULL,
        Person_LastName NVARCHAR(30) NOT NULL
    );
END
GO

-- Create dbo.Contractor
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Contractor') AND type = 'U')
BEGIN
    CREATE TABLE dbo.Contractor (
        ID           INT IDENTITY(1,1) PRIMARY KEY,
        Contractor   NVARCHAR(50)  NOT NULL,
        Foreman_Name NVARCHAR(100) NOT NULL,
        Foreman_Tel  NVARCHAR(10)  NOT NULL
    );
END
GO

-- Create dbo.Work_Permit
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.Work_Permit') AND type = 'U')
BEGIN
    CREATE TABLE dbo.Work_Permit (
        Work_Permit_No  NVARCHAR(12)  PRIMARY KEY,
        Created_Date    DATE          NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        Contractor      NVARCHAR(500) NULL,
        Contractor_Tel  NVARCHAR(200) NULL,
        Request_For     NVARCHAR(200) NOT NULL,
        Area            NVARCHAR(100) NOT NULL,
        Start_Date      DATE          NOT NULL,
        End_Date        DATE          NOT NULL,
        Days            INT           NULL,
        Workers         INT           NOT NULL,
        Department      NVARCHAR(5)   NOT NULL,
        Controller      NVARCHAR(60)  NULL,
        Safety_Officer  NVARCHAR(60)  NULL,
        Status          NVARCHAR(20)  NOT NULL DEFAULT 'Open',
        File_Path       NVARCHAR(500) NULL
    );
END
GO
