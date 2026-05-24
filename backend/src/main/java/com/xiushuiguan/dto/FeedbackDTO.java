package com.xiushuiguan.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FeedbackDTO {
    private Long id;
    private String nickname;
    private String type;
    private String content;
    private String status;
    private String remark;
    private LocalDateTime createTime;
}
